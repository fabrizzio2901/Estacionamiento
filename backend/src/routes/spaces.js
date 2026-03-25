const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/spaces - Obtener todos los cajones
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const spaces = await prisma.parkingSpace.findMany({
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { name: true, email: true } } },
          take: 1,
        },
      },
    });
    res.json(spaces);
  } catch (error) {
    console.error('[Spaces] Error:', error);
    res.status(500).json({ error: 'Error al obtener cajones' });
  }
});

// GET /api/spaces/stats - Estadísticas rápidas
router.get('/stats', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const [total, occupied] = await Promise.all([
      prisma.parkingSpace.count(),
      prisma.parkingSpace.count({ where: { status: 'OCCUPIED' } }),
    ]);
    res.json({ total, occupied, free: total - occupied, occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(1) : 0 });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
