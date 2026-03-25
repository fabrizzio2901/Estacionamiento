const express = require('express');
const router = express.Router();

// POST /api/qr/entrada
// Se llama cuando el conductor escanea su QR al entrar
router.post('/entrada', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId es requerido' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const sesionActiva = await prisma.session.findFirst({
      where: { userId, status: 'ACTIVE' }
    });

    if (sesionActiva) {
      return res.status(409).json({
        error: 'El conductor ya tiene una sesión activa',
        sessionId: sesionActiva.id
      });
    }

    console.log(`[QR] Conductor ${user.name} escaneó QR de entrada`);

    io.emit('qrEntrada', {
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Bienvenido ${user.name}, busca un cajón libre`,
      user: { id: user.id, name: user.name }
    });

  } catch (error) {
    console.error('[QR] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/qr/generar/:userId
// Devuelve los datos que debe contener el QR del conductor
router.get('/generar/:userId', async (req, res) => {
  const prisma = req.app.get('prisma');

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      qrData: user.id,
      userName: user.name,
      instructions: `Este QR identifica a ${user.name}. Escanéalo al entrar al estacionamiento.`
    });

  } catch (error) {
    res.status(500).json({ error: 'Error generando QR' });
  }
});

module.exports = router;
