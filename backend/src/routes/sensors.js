const express = require('express');
const router = express.Router();
const { processSensorUpdate } = require('../services/sensorService');

/**
 * POST /api/sensors/update
 * Endpoint HTTP para recibir datos de sensores físicos.
 * 
 * Body esperado:
 * {
 *   "sensorId": "SENSOR_A01",
 *   "status": 1  // 0 = libre, 1 = ocupado
 * }
 * 
 * Opcionalmente puede incluir:
 * {
 *   "userId": "uuid-del-usuario"  // Para vincular con un conductor
 * }
 */
router.post('/update', async (req, res) => {
  const { sensorId, status, userId } = req.body;

  if (sensorId === undefined || status === undefined) {
    return res.status(400).json({ error: 'sensorId y status son requeridos' });
  }

  if (![0, 1].includes(Number(status))) {
    return res.status(400).json({ error: 'status debe ser 0 (libre) o 1 (ocupado)' });
  }

  const io = req.app.get('io');
  const prisma = req.app.get('prisma');

  try {
    const result = await processSensorUpdate({ sensorId, status: Number(status), userId, io, prisma });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Sensor HTTP] Error:', error.message);
    res.status(500).json({ error: error.message || 'Error al procesar sensor' });
  }
});

// GET /api/sensors - Listar sensores registrados
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const spaces = await prisma.parkingSpace.findMany({
      select: { id: true, number: true, sensorId: true, status: true, zone: true, floor: true },
      orderBy: { number: 'asc' },
    });
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sensores' });
  }
});

module.exports = router;
