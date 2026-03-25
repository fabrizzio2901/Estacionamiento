/**
 * Servicio principal de sensores.
 * Contiene toda la lógica de negocio para procesar
 * actualizaciones de sensores físicos.
 */

const TARIFA_POR_HORA = Number(process.env.TARIFA_POR_HORA) || 20; // MXN

/**
 * Procesa la actualización de un sensor.
 * Usado tanto por el endpoint HTTP como por el servicio MQTT.
 */
async function processSensorUpdate({ sensorId, status, userId, io, prisma }) {
  // Buscar el cajón asociado al sensor
  const space = await prisma.parkingSpace.findUnique({
    where: { sensorId },
    include: {
      sessions: {
        where: { status: 'ACTIVE' },
        orderBy: { entryTime: 'desc' },
        take: 1,
      },
    },
  });

  if (!space) {
    throw new Error(`Sensor ${sensorId} no registrado en el sistema`);
  }

  const newStatus = status === 1 ? 'OCCUPIED' : 'FREE';
  let paymentGenerated = null;
  let activeSession = space.sessions[0] || null;

  // === CAJÓN SE OCUPA (0 → 1) ===
  if (newStatus === 'OCCUPIED' && space.status === 'FREE') {
    // Actualizar estado del cajón
    const updatedSpace = await prisma.parkingSpace.update({
      where: { sensorId },
      data: { status: 'OCCUPIED' },
    });

    // Crear nueva sesión
    if (userId) {
      activeSession = await prisma.session.create({
        data: {
          userId,
          parkingSpaceId: space.id,
          status: 'ACTIVE',
        },
      });
      console.log(`[Sensor] Sesión iniciada: espacio ${space.number}, usuario ${userId}`);
    }

    // Emitir actualización por Socket.io
    io.emit('spaceUpdate', {
      spaceId: space.id,
      number: space.number,
      sensorId,
      status: 'OCCUPIED',
      zone: space.zone,
      floor: space.floor,
      sessionId: activeSession?.id || null,
    });

    return { space: updatedSpace, session: activeSession, action: 'OCCUPIED' };
  }

  // === CAJÓN SE LIBERA (1 → 0) ===
  if (newStatus === 'FREE' && space.status === 'OCCUPIED') {
    const updatedSpace = await prisma.parkingSpace.update({
      where: { sensorId },
      data: { status: 'FREE' },
    });

    // Cerrar sesión activa y calcular cobro
    if (activeSession) {
      const exitTime = new Date();
      const durationMs = exitTime - new Date(activeSession.entryTime);
      const durationMins = Math.ceil(durationMs / 60000);
      const durationHours = durationMins / 60;
      const amount = Math.max(parseFloat((durationHours * TARIFA_POR_HORA).toFixed(2)), 5); // mínimo $5 MXN

      // Actualizar sesión como completada
      const closedSession = await prisma.session.update({
        where: { id: activeSession.id },
        data: { exitTime, durationMins, status: 'COMPLETED' },
      });

      // Generar registro de pago pendiente
      paymentGenerated = await prisma.payment.create({
        data: {
          sessionId: closedSession.id,
          userId: activeSession.userId,
          amount,
          status: 'PENDING',
        },
      });

      console.log(`[Sensor] Sesión cerrada: espacio ${space.number}, duración ${durationMins} min, cobro $${amount} MXN`);
    }

    // Emitir actualización por Socket.io
    io.emit('spaceUpdate', {
      spaceId: space.id,
      number: space.number,
      sensorId,
      status: 'FREE',
      zone: space.zone,
      floor: space.floor,
      payment: paymentGenerated
        ? { amount: paymentGenerated.amount, paymentId: paymentGenerated.id }
        : null,
    });

    return { space: updatedSpace, session: activeSession, payment: paymentGenerated, action: 'FREED' };
  }

  // Sin cambio de estado
  console.log(`[Sensor] Sin cambio: espacio ${space.number} ya está en ${space.status}`);
  return { space, action: 'NO_CHANGE' };
}

/**
 * Calcula el costo acumulado de una sesión activa en tiempo real.
 */
function calculateCurrentCost(entryTime) {
  const now = new Date();
  const durationMs = now - new Date(entryTime);
  const durationHours = durationMs / 3600000;
  return {
    durationMins: Math.floor(durationMs / 60000),
    currentCost: parseFloat((durationHours * TARIFA_POR_HORA).toFixed(2)),
    tarifaHora: TARIFA_POR_HORA,
  };
}

module.exports = { processSensorUpdate, calculateCurrentCost };
