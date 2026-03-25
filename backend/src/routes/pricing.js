const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/pricing  — regla activa (pública, la usan los sensores para calcular)
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const rule = await prisma.pricingRule.findFirst({ where: { isActive: true } });
    res.json(rule || { type: 'HOURLY', pricePerHour: Number(process.env.TARIFA_POR_HORA) || 20 });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tarifa' });
  }
});

// GET /api/pricing/all  — todas las reglas (solo admin)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const rules = await prisma.pricingRule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tarifas' });
  }
});

// POST /api/pricing  — crear nueva regla
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, type, pricePerHour, ranges } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
  }
  if (type === 'HOURLY' && !pricePerHour) {
    return res.status(400).json({ error: 'pricePerHour requerido para tarifa por hora' });
  }

  try {
    const rule = await prisma.pricingRule.create({
      data: {
        name,
        type,
        pricePerHour: type === 'HOURLY' ? Number(pricePerHour) : null,
        ranges: type === 'RANGES' ? ranges : null,
        isActive: false,
      },
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear tarifa' });
  }
});

// PATCH /api/pricing/:id/activate  — activar una regla (desactiva las demás)
router.patch('/:id/activate', authMiddleware, adminMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    await prisma.pricingRule.updateMany({ data: { isActive: false } });
    const rule = await prisma.pricingRule.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Error al activar tarifa' });
  }
});

// PUT /api/pricing/:id  — editar regla
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, type, pricePerHour, ranges } = req.body;
  try {
    const rule = await prisma.pricingRule.update({
      where: { id: req.params.id },
      data: {
        name,
        type,
        pricePerHour: type === 'HOURLY' ? Number(pricePerHour) : null,
        ranges: type === 'RANGES' ? ranges : null,
      },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Error al editar tarifa' });
  }
});

// DELETE /api/pricing/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    await prisma.pricingRule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar tarifa' });
  }
});

module.exports = router;
