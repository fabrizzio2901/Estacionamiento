const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { calculateCurrentCost } = require('../services/sensorService');

// GET /api/sessions/active - Sesión activa del usuario autenticado
router.get('/active', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const session = await prisma.session.findFirst({
      where: { userId: req.user.id, status: 'ACTIVE' },
      include: {
        parkingSpace: true,
      },
      orderBy: { entryTime: 'desc' },
    });

    if (!session) {
      return res.json({ session: null });
    }

    const costInfo = calculateCurrentCost(session.entryTime);
    res.json({ session, ...costInfo });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesión activa' });
  }
});

// GET /api/sessions/history - Historial del usuario
router.get('/history', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id },
      include: {
        parkingSpace: { select: { number: true, zone: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// POST /api/sessions/:id/pay - Registrar pago
router.post('/:id/pay', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  const { method } = req.body;

  try {
    const payment = await prisma.payment.updateMany({
      where: { sessionId: req.params.id, userId: req.user.id, status: 'PENDING' },
      data: { status: 'PAID', method: method || 'EFECTIVO' },
    });

    if (payment.count === 0) {
      return res.status(404).json({ error: 'Pago no encontrado o ya procesado' });
    }

    res.json({ success: true, message: 'Pago registrado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar pago' });
  }
});

module.exports = router;
