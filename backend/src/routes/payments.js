const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// POST /api/payments/create-intent
// Crea un PaymentIntent de Stripe para cobrar al conductor
router.post('/create-intent', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  const { sessionId } = req.body;
  const stripe = getStripe();

  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no está configurado. Agrega STRIPE_SECRET_KEY en .env' });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { sessionId, userId: req.user.id, status: 'PENDING' },
      include: { session: { include: { parkingSpace: true } } },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado o ya procesado' });
    }

    // Stripe maneja centavos, multiplicamos por 100
    const amountCents = Math.round(payment.amount * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'mxn',
      metadata: {
        paymentId: payment.id,
        sessionId,
        userId: req.user.id,
        spaceNumber: String(payment.session.parkingSpace.number),
      },
      description: `ParkIQ — Cajón #${payment.session.parkingSpace.number}`,
    });

    // Guardar el ID de Stripe en nuestra BD
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentId: intent.id,
        stripeClientSecret: intent.client_secret,
      },
    });

    res.json({
      clientSecret: intent.client_secret,
      amount: payment.amount,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('[Stripe] Error creando intent:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/confirm/:paymentId
// Confirmar pago exitoso (llamado desde el frontend después de Stripe)
router.post('/confirm/:paymentId', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const stripe = getStripe();

  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.paymentId, userId: req.user.id },
    });

    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    if (payment.status === 'PAID') return res.json({ success: true, message: 'Ya estaba pagado' });

    // Verificar con Stripe que realmente se pagó
    if (stripe && payment.stripePaymentId) {
      const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
      if (intent.status !== 'succeeded') {
        return res.status(400).json({ error: 'El pago no ha sido completado en Stripe' });
      }
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', method: 'TARJETA' },
    });

    // Notificar al dashboard admin en tiempo real
    io.emit('paymentConfirmed', { paymentId: payment.id, amount: payment.amount });

    res.json({ success: true, message: 'Pago confirmado correctamente' });
  } catch (error) {
    console.error('[Payments] Error confirmando:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/webhook  (llamado directamente por Stripe)
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.sendStatus(200);

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Webhook] Firma inválida:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const prisma = req.app.get('prisma');

    await prisma.payment.updateMany({
      where: { stripePaymentId: intent.id },
      data: { status: 'PAID', method: 'TARJETA' },
    });
    console.log(`[Webhook] Pago exitoso: ${intent.id}`);
  }

  res.sendStatus(200);
});

// GET /api/payments/pending  — pagos pendientes del usuario actual
router.get('/pending', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id, status: 'PENDING' },
      include: {
        session: { include: { parkingSpace: { select: { number: true, zone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pagos pendientes' });
  }
});

module.exports = router;
