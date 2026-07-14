/**
 * RF-04/05/06: Generación de QR con payload encriptado
 * RF-07/08/09/10/11/12: Flujo de entrada con validaciones
 * RF-13/14/15/16/17/18/19: Flujo de salida y cobro
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

const TARIFA_POR_HORA = Number(process.env.TARIFA_POR_HORA) || 20;
// RF-06: Clave de encriptación para el payload del QR
const QR_SECRET = process.env.QR_SECRET || 'parkiq-qr-secret-key-change-in-production';

// ─── Helpers de encriptación ───────────────────────────────────────────────
function encryptPayload(data) {
  const key = crypto.createHash('sha256').update(QR_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPayload(token) {
  const [ivHex, encHex] = token.split(':');
  const key = crypto.createHash('sha256').update(QR_SECRET).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// ─── GET /api/qr/generar ───────────────────────────────────────────────────
// RF-05/06: Devuelve el token encriptado que el frontend convierte en QR
router.get('/generar', authMiddleware, async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, walletBalance: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // RF-06: Payload mínimo — solo userId + timestamp de expiración (10 min)
    const payload = {
      userId: user.id,
      exp: Date.now() + 10 * 60 * 1000, // 10 minutos
    };

    const qrToken = encryptPayload(payload);

    res.json({
      qrToken,                 // token encriptado para el QR
      userName: user.name,
      walletBalance: user.walletBalance,
      isNegative: user.walletBalance < 0,
    });
  } catch (error) {
    console.error('[QR] Error generando token:', error);
    res.status(500).json({ error: 'Error generando QR' });
  }
});

// ─── POST /api/qr/entrada ──────────────────────────────────────────────────
// RF-07/08/09/10/11/12: Flujo completo de entrada
router.post('/entrada', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { qrToken, userId: rawUserId } = req.body;

  let userId;

  // RF-07: Decodificar QR (token encriptado o userId directo para compatibilidad)
  if (qrToken) {
    try {
      const payload = decryptPayload(qrToken);
      if (Date.now() > payload.exp) {
        return res.status(400).json({ error: 'QR expirado. Genera uno nuevo en la app.' });
      }
      userId = payload.userId;
    } catch (err) {
      return res.status(400).json({ error: 'QR inválido o corrupto' });
    }
  } else if (rawUserId) {
    userId = rawUserId; // compatibilidad hacia atrás con escáneres que mandan userId plano
  } else {
    return res.status(400).json({ error: 'Se requiere qrToken o userId' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, walletBalance: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // RF-08: Validar que no haya estancia activa
    const sesionActiva = await prisma.session.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (sesionActiva) {
      return res.status(409).json({
        acceso: false,
        motivo: 'SESION_ACTIVA',
        error: 'El conductor ya tiene una estancia activa',
        sessionId: sesionActiva.id,
      });
    }

    // RF-09/RF-10: Validar saldo >= 0
    if (user.walletBalance < 0) {
      console.log(`[QR Entrada] ACCESO DENEGADO — usuario ${user.name} tiene saldo negativo: $${user.walletBalance}`);
      return res.status(403).json({
        acceso: false,
        motivo: 'SALDO_NEGATIVO',
        error: 'Acceso Denegado: Saldo Pendiente',
        saldo: user.walletBalance,
        mensaje: `Tu saldo es $${user.walletBalance.toFixed(2)} MXN. Recarga tu billetera para poder ingresar.`,
      });
    }

    // RF-11: Crear nueva estancia
    const nuevaSesion = await prisma.session.create({
      data: {
        userId,
        status: 'ACTIVE',
        entryTime: new Date(),
      },
    });

    console.log(`[QR Entrada] ✅ Acceso concedido — ${user.name} | sesión ${nuevaSesion.id}`);

    // RF-12: Señal de apertura de barrera de entrada vía Socket.io / MQTT
    io.emit('abrirBarreraEntrada', {
      sessionId: nuevaSesion.id,
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    // También publicar por MQTT si está disponible
    const { getMQTTClient } = require('../services/mqttService');
    const mqttClient = getMQTTClient();
    if (mqttClient) {
      mqttClient.publish(
        'parking/barrera/entrada',
        JSON.stringify({ accion: 'ABRIR', sessionId: nuevaSesion.id }),
      );
    }

    res.json({
      acceso: true,
      message: `Bienvenido ${user.name}`,
      sessionId: nuevaSesion.id,
      saldo: user.walletBalance,
    });

  } catch (error) {
    console.error('[QR Entrada] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/qr/salida ───────────────────────────────────────────────────
// RF-13/14/15/16/17/18/19: Flujo completo de salida y cobro
router.post('/salida', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { qrToken, userId: rawUserId } = req.body;

  let userId;

  // RF-13: Decodificar QR de salida
  if (qrToken) {
    try {
      const payload = decryptPayload(qrToken);
      if (Date.now() > payload.exp) {
        return res.status(400).json({ error: 'QR expirado. Genera uno nuevo en la app.' });
      }
      userId = payload.userId;
    } catch (err) {
      return res.status(400).json({ error: 'QR inválido o corrupto' });
    }
  } else if (rawUserId) {
    userId = rawUserId;
  } else {
    return res.status(400).json({ error: 'Se requiere qrToken o userId' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, walletBalance: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // RF-14: Recuperar estancia activa
    const sesionActiva = await prisma.session.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { entryTime: 'desc' },
    });
    if (!sesionActiva) {
      return res.status(404).json({ error: 'No se encontró estancia activa para este usuario' });
    }

    // RF-15: Calcular tiempo transcurrido
    const ahora = new Date();
    const durationMs = ahora - new Date(sesionActiva.entryTime);
    const durationMins = Math.ceil(durationMs / 60000);
    const durationHours = durationMs / 3600000;

    // RF-16: Calcular tarifa
    const tarifaHora = TARIFA_POR_HORA;
    const monto = Math.max(parseFloat((durationHours * tarifaHora).toFixed(2)), 5); // mínimo $5 MXN

    // RF-17/RF-18: Deducir saldo y finalizar estancia en una transacción atómica
    // RF-03: El saldo puede quedar negativo si no hay suficiente balance
    const [sesionFinalizada, usuarioActualizado] = await prisma.$transaction([
      prisma.session.update({
        where: { id: sesionActiva.id },
        data: {
          exitTime: ahora,
          durationMins,
          amount: monto,
          status: 'COMPLETED',  // RF-18: estado → FINALIZADA
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: monto } }, // RF-17: cobro directo a billetera
      }),
    ]);

    // Crear registro de pago interno (sin Stripe en salida)
    const pago = await prisma.payment.create({
      data: {
        sessionId: sesionFinalizada.id,
        userId,
        amount: monto,
        status: 'PAID',
        method: 'BILLETERA',
      },
    });

    console.log(
      `[QR Salida] ✅ Sesión cerrada — ${user.name} | ${durationMins} min | $${monto} MXN | saldo nuevo: $${usuarioActualizado.walletBalance}`
    );

    // RF-19: Señal de apertura de barrera de salida
    io.emit('abrirBarreraSalida', {
      sessionId: sesionFinalizada.id,
      userId: user.id,
      userName: user.name,
      monto,
      saldoNuevo: usuarioActualizado.walletBalance,
      timestamp: ahora.toISOString(),
    });

    const { getMQTTClient } = require('../services/mqttService');
    const mqttClient = getMQTTClient();
    if (mqttClient) {
      mqttClient.publish(
        'parking/barrera/salida',
        JSON.stringify({ accion: 'ABRIR', sessionId: sesionFinalizada.id }),
      );
    }

    // Notificar al dashboard admin
    io.emit('sessionClosed', {
      sessionId: sesionFinalizada.id,
      userId,
      monto,
      saldoNuevo: usuarioActualizado.walletBalance,
    });

    res.json({
      success: true,
      sessionId: sesionFinalizada.id,
      durationMins,
      monto,
      saldoAnterior: user.walletBalance,
      saldoNuevo: usuarioActualizado.walletBalance,
      saldoNegativo: usuarioActualizado.walletBalance < 0,
      mensaje: usuarioActualizado.walletBalance < 0
        ? `¡Hasta pronto ${user.name}! Tu saldo quedó en $${usuarioActualizado.walletBalance.toFixed(2)} MXN. Recarga para poder ingresar nuevamente.`
        : `¡Hasta pronto ${user.name}! Se cobraron $${monto.toFixed(2)} MXN de tu billetera.`,
    });

  } catch (error) {
    console.error('[QR Salida] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
