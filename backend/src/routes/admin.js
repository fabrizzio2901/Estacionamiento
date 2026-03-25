const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware, adminMiddleware);

// ─── ESTADÍSTICAS ────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total, occupied, activeSessions, todayRevenue, todaySessions, totalRevenue, totalUsers] =
      await Promise.all([
        prisma.parkingSpace.count({ where: { enabled: true } }),
        prisma.parkingSpace.count({ where: { status: 'OCCUPIED', enabled: true } }),
        prisma.session.count({ where: { status: 'ACTIVE' } }),
        prisma.payment.aggregate({ where: { status: 'PAID', createdAt: { gte: today } }, _sum: { amount: true } }),
        prisma.session.count({ where: { createdAt: { gte: today } } }),
        prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
        prisma.user.count({ where: { role: 'DRIVER' } }),
      ]);

    res.json({
      spaces: { total, occupied, free: total - occupied, occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(1) : 0 },
      sessions: { active: activeSessions, today: todaySessions },
      revenue: { today: todayRevenue._sum.amount || 0, total: totalRevenue._sum.amount || 0 },
      users: { total: totalUsers },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ─── CAJONES ────────────────────────────────────────────────────
// GET /api/admin/spaces
router.get('/spaces', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const spaces = await prisma.parkingSpace.findMany({
      orderBy: [{ zone: 'asc' }, { number: 'asc' }],
    });
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cajones' });
  }
});

// POST /api/admin/spaces
router.post('/spaces', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { number, sensorId, floor, zone } = req.body;
  if (!number || !sensorId) return res.status(400).json({ error: 'number y sensorId son requeridos' });
  try {
    const space = await prisma.parkingSpace.create({
      data: { number: Number(number), sensorId, floor: Number(floor) || 1, zone: zone || 'A' },
    });
    res.status(201).json(space);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Número de cajón o sensorId ya existe' });
    res.status(500).json({ error: 'Error al crear cajón' });
  }
});

// PUT /api/admin/spaces/:id
router.put('/spaces/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { number, sensorId, floor, zone } = req.body;
  try {
    const space = await prisma.parkingSpace.update({
      where: { id: req.params.id },
      data: {
        ...(number !== undefined && { number: Number(number) }),
        ...(sensorId !== undefined && { sensorId }),
        ...(floor !== undefined && { floor: Number(floor) }),
        ...(zone !== undefined && { zone }),
      },
    });
    res.json(space);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Número de cajón o sensorId ya existe' });
    res.status(500).json({ error: 'Error al editar cajón' });
  }
});

// PATCH /api/admin/spaces/:id/toggle  — habilitar / deshabilitar
router.patch('/spaces/:id/toggle', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  try {
    const current = await prisma.parkingSpace.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Cajón no encontrado' });

    const space = await prisma.parkingSpace.update({
      where: { id: req.params.id },
      data: { enabled: !current.enabled },
    });
    io.emit('spaceToggled', { spaceId: space.id, enabled: space.enabled });
    res.json(space);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del cajón' });
  }
});

// DELETE /api/admin/spaces/:id
router.delete('/spaces/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const hasSessions = await prisma.session.count({ where: { parkingSpaceId: req.params.id } });
    if (hasSessions > 0) {
      return res.status(409).json({ error: 'No puedes eliminar un cajón que tiene sesiones registradas' });
    }
    await prisma.parkingSpace.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cajón' });
  }
});

// ─── USUARIOS ───────────────────────────────────────────────────
// GET /api/admin/users
router.get('/users', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, active: true, createdAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: role === 'ADMIN' ? 'ADMIN' : 'DRIVER' },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { role } = req.body;
  if (!['ADMIN', 'DRIVER'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar rol' });
  }
});

// PATCH /api/admin/users/:id/toggle  — activar/desactivar usuario
router.patch('/users/:id/toggle', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const current = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Usuario no encontrado' });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { active: !current.active },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }
  try {
    const hasSessions = await prisma.session.count({ where: { userId: req.params.id } });
    if (hasSessions > 0) return res.status(409).json({ error: 'No puedes eliminar un usuario con sesiones registradas' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// GET /api/admin/sessions  — sesiones recientes paginadas
router.get('/sessions', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { page = 1, limit = 20, status } = req.query;
  try {
    const where = status ? { status } : {};
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          parkingSpace: { select: { number: true, zone: true, floor: true } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.session.count({ where }),
    ]);
    res.json({ sessions, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
});

module.exports = router;
