const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware, adminMiddleware);

// GET /api/reports/revenue?period=week|month|year
router.get('/revenue', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { period = 'week' } = req.query;

  const now = new Date();
  let startDate;
  let groupFormat;

  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    groupFormat = 'day';
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    groupFormat = 'day';
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
    groupFormat = 'month';
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'PAID', createdAt: { gte: startDate } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por día o mes
    const map = {};
    payments.forEach(({ amount, createdAt }) => {
      const d = new Date(createdAt);
      const key = groupFormat === 'day'
        ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
        : d.toLocaleDateString('es-MX', { month: 'long' });
      map[key] = (map[key] || 0) + amount;
    });

    const data = Object.entries(map).map(([label, total]) => ({
      label,
      total: parseFloat(total.toFixed(2)),
    }));

    const totalPeriod = payments.reduce((s, p) => s + p.amount, 0);
    const totalSessions = await prisma.session.count({
      where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
    });

    res.json({ data, totalPeriod: parseFloat(totalPeriod.toFixed(2)), totalSessions });
  } catch (error) {
    console.error('[Reports] Revenue error:', error);
    res.status(500).json({ error: 'Error generando reporte de ingresos' });
  }
});

// GET /api/reports/occupancy  — estadísticas por cajón y zona
router.get('/occupancy', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const spaces = await prisma.parkingSpace.findMany({
      include: {
        sessions: {
          where: { status: 'COMPLETED' },
          select: { durationMins: true, createdAt: true },
        },
      },
      orderBy: { number: 'asc' },
    });

    const spaceStats = spaces.map((s) => {
      const totalSessions = s.sessions.length;
      const avgDuration = totalSessions > 0
        ? Math.round(s.sessions.reduce((a, b) => a + (b.durationMins || 0), 0) / totalSessions)
        : 0;
      return {
        id: s.id,
        number: s.number,
        zone: s.zone,
        floor: s.floor,
        status: s.status,
        enabled: s.enabled,
        totalSessions,
        avgDurationMins: avgDuration,
      };
    });

    // Agrupar por zona
    const zones = {};
    spaceStats.forEach((s) => {
      if (!zones[s.zone]) zones[s.zone] = { zone: s.zone, spaces: 0, sessions: 0 };
      zones[s.zone].spaces++;
      zones[s.zone].sessions += s.totalSessions;
    });

    res.json({ spaces: spaceStats, zones: Object.values(zones) });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte de ocupación' });
  }
});

// GET /api/reports/sessions/export?format=json  — export de sesiones
router.get('/sessions/export', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { from, to } = req.query;

  const where = { status: 'COMPLETED' };
  if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

  try {
    const sessions = await prisma.session.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        parkingSpace: { select: { number: true, zone: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Formatear para Excel/CSV
    const rows = sessions.map((s) => ({
      'ID Sesión': s.id,
      'Usuario': s.user?.name || '',
      'Email': s.user?.email || '',
      'Cajón': s.parkingSpace?.number || '',
      'Zona': s.parkingSpace?.zone || '',
      'Entrada': s.entryTime ? new Date(s.entryTime).toLocaleString('es-MX') : '',
      'Salida': s.exitTime ? new Date(s.exitTime).toLocaleString('es-MX') : '',
      'Duración (min)': s.durationMins || 0,
      'Monto ($MXN)': s.payment?.amount?.toFixed(2) || '0.00',
      'Estado pago': s.payment?.status === 'PAID' ? 'Pagado' : 'Pendiente',
      'Método': s.payment?.method || '—',
    }));

    // Generar XLSX con la librería xlsx
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 36 }, { wch: 20 }, { wch: 28 }, { wch: 8 },
      { wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 14 },
      { wch: 12 }, { wch: 14 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sesiones');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="reporte_sesiones.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('[Reports] Export error:', error);
    res.status(500).json({ error: 'Error exportando sesiones' });
  }
});

// GET /api/reports/payments/pending  — pagos pendientes globales
router.get('/payments/pending', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { name: true, email: true } },
        session: { include: { parkingSpace: { select: { number: true, zone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const total = payments.reduce((s, p) => s + p.amount, 0);
    res.json({ payments, totalPending: parseFloat(total.toFixed(2)) });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo pagos pendientes' });
  }
});

module.exports = router;
