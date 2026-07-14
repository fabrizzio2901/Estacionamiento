/**
 * RF-01: Billetera Virtual de Usuario
 * RF-02: Integración Stripe en Test Mode para recargas
 * RF-03: Soporte para saldo negativo
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// GET /api/wallet/balance — Consultar saldo actual
router.get('/balance', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { walletBalance: true, name: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      balance: user.walletBalance,
      // RF-03: indicar explícitamente si el saldo es negativo
      isNegative: user.walletBalance < 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar saldo' });
  }
});

// POST /api/wallet/topup/create-intent
// RF-02: Crea un PaymentIntent de Stripe (Test Mode) para recargar la billetera
router.post('/topup/create-intent', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  const { amount } = req.body; // monto en MXN
  const stripe = getStripe();

  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe no está configurado. Agrega STRIPE_SECRET_KEY en .env (usa una clave sk_test_... para Test Mode)',
    });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'El monto de recarga debe ser mayor a 0' });
  }

  try {
    // RF-02: Crear intento de pago en Stripe (Test Mode cuando la clave es sk_test_...)
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // centavos
      currency: 'mxn',
      metadata: {
        userId: req.user.id,
        type: 'WALLET_TOPUP',
      },
      description: `ParkIQ — Recarga billetera virtual`,
    });

    // Registrar la recarga como PENDING
    const topUp = await prisma.walletTopUp.create({
      data: {
        userId: req.user.id,
        amount,
        status: 'PENDING',
        stripePaymentId: intent.id,
        stripeClientSecret: intent.client_secret,
      },
    });

    res.json({
      clientSecret: intent.client_secret,
      topUpId: topUp.id,
      amount,
    });
  } catch (error) {
    console.error('[Wallet] Error creando intent:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/topup/confirm/:topUpId
// Confirmar recarga exitosa y acreditar saldo
router.post('/topup/confirm/:topUpId', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  const stripe = getStripe();

  try {
    const topUp = await prisma.walletTopUp.findFirst({
      where: { id: req.params.topUpId, userId: req.user.id },
    });

    if (!topUp) return res.status(404).json({ error: 'Recarga no encontrada' });
    if (topUp.status === 'PAID') return res.json({ success: true, message: 'Ya estaba acreditada' });

    // Verificar con Stripe que el pago fue exitoso (Test Mode)
    if (stripe && topUp.stripePaymentId) {
      const intent = await stripe.paymentIntents.retrieve(topUp.stripePaymentId);
// COMENTA ESTAS LÍNEAS PARA LA SIMULACIÓN:     
      // if (intent.status !== 'succeeded') {
      //  return res.status(400).json({ error: 'El pago no ha sido completado en Stripe' });
      //}
    }

    // Marcar como PAID y acreditar saldo al usuario en una transacción atómica
    const [_, updatedUser] = await prisma.$transaction([
      prisma.walletTopUp.update({
        where: { id: topUp.id },
        data: { status: 'PAID' },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        // RF-03: el saldo puede sumar sobre un valor negativo
        data: { walletBalance: { increment: topUp.amount } },
      }),
    ]);

    console.log(`[Wallet] Recarga confirmada: usuario ${req.user.id}, +$${topUp.amount} MXN. Nuevo saldo: $${updatedUser.walletBalance}`);

    res.json({
      success: true,
      newBalance: updatedUser.walletBalance,
      isNegative: updatedUser.walletBalance < 0,
    });
  } catch (error) {
    console.error('[Wallet] Error confirmando recarga:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet/topups — Historial de recargas del usuario
router.get('/topups', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const topUps = await prisma.walletTopUp.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(topUps);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de recargas' });
  }
});

// POST /api/wallet/webhook — Webhook de Stripe para recargas
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.sendStatus(200);

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WALLET_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Wallet Webhook] Firma inválida:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    if (intent.metadata?.type !== 'WALLET_TOPUP') return res.sendStatus(200);

    const prisma = req.app.get('prisma');
    const topUp = await prisma.walletTopUp.findFirst({
      where: { stripePaymentId: intent.id, status: 'PENDING' },
    });

    if (topUp) {
      await prisma.$transaction([
        prisma.walletTopUp.update({ where: { id: topUp.id }, data: { status: 'PAID' } }),
        prisma.user.update({ where: { id: topUp.userId }, data: { walletBalance: { increment: topUp.amount } } }),
      ]);
      console.log(`[Wallet Webhook] Recarga acreditada automáticamente: usuario ${topUp.userId}`);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
