const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpiar datos previos de transacciones para evitar conflictos
  await prisma.payment.deleteMany();
  await prisma.session.deleteMany();

  // Usuarios de prueba
  const adminPass = await bcrypt.hash('admin123', 10);
  const driverPass = await bcrypt.hash('driver123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@parkiq.com' },
    update: {},
    create: {
      email: 'admin@parkiq.com',
      password: adminPass,
      name: 'Administrador',
      role: 'ADMIN',
      walletBalance: 0,
    },
  });

  // Juan García: Cuenta "Limpia" para pruebas desde cero
  const driver1 = await prisma.user.upsert({
    where: { email: 'conductor@parkiq.com' },
    update: {},
    create: {
      email: 'conductor@parkiq.com',
      password: driverPass,
      name: 'Juan García',
      role: 'DRIVER',
      walletBalance: 100, // Saldo inicial intacto
    },
  });

  const driver2 = await prisma.user.upsert({
    where: { email: 'conductor2@parkiq.com' },
    update: {},
    create: {
      email: 'conductor2@parkiq.com',
      password: driverPass,
      name: 'María López',
      role: 'DRIVER',
      walletBalance: 50,
    },
  });

  const driver3 = await prisma.user.upsert({
    where: { email: 'conductor3@parkiq.com' },
    update: {},
    create: {
      email: 'conductor3@parkiq.com',
      password: driverPass,
      name: 'Carlos Ruiz',
      role: 'DRIVER',
      walletBalance: 200,
    },
  });

  // NUEVO: Usuario con saldo negativo para probar el bloqueo de acceso
  const driver4 = await prisma.user.upsert({
    where: { email: 'conductor4@parkiq.com' },
    update: {},
    create: {
      email: 'conductor4@parkiq.com',
      password: driverPass,
      name: 'Pedro Deudor',
      role: 'DRIVER',
      walletBalance: -50, // Saldo negativo
    },
  });

  // Cajones de estacionamiento
  const spacesData = [
    { number: 1, sensorId: 'SENSOR_A01', zone: 'A', floor: 1, status: 'FREE' },
    { number: 2, sensorId: 'SENSOR_A02', zone: 'A', floor: 1, status: 'FREE' },
    { number: 3, sensorId: 'SENSOR_A03', zone: 'A', floor: 1, status: 'FREE' },
    { number: 4, sensorId: 'SENSOR_B01', zone: 'B', floor: 1, status: 'OCCUPIED' },
    { number: 5, sensorId: 'SENSOR_B02', zone: 'B', floor: 1, status: 'OCCUPIED' },
    { number: 6, sensorId: 'SENSOR_B03', zone: 'B', floor: 1, status: 'FREE' },
  ];

  const spaces = [];
  for (const s of spacesData) {
    const space = await prisma.parkingSpace.upsert({
      where: { sensorId: s.sensorId },
      update: { status: s.status },
      create: s,
    });
    spaces.push(space);
  }

  // Regla de precios por defecto
  await prisma.pricingRule.upsert({
    where: { id: 'default-hourly' },
    update: {},
    create: {
      id: 'default-hourly',
      name: 'Tarifa Estándar',
      type: 'HOURLY',
      pricePerHour: 20,
      isActive: true,
    },
  });

  console.log('📊 Generando datos para métricas y simulador de pagos...');

  const now = new Date();

  // Historial para métricas del Admin (Se asigna a conductor2 y conductor3)
  
  // Sesión 1: Asignada a María (driver2)
  const session1 = await prisma.session.create({
    data: {
      userId: driver2.id, 
      parkingSpaceId: spaces[0].id, 
      entryTime: new Date(now.getTime() - 48 * 60 * 60 * 1000), 
      exitTime: new Date(now.getTime() - 46 * 60 * 60 * 1000), 
      durationMins: 120,
      amount: 40,
      status: 'COMPLETED',
    }
  });
  await prisma.payment.create({
    data: {
      sessionId: session1.id,
      userId: driver2.id,
      amount: 40,
      status: 'PAID',
      method: 'WALLET'
    }
  });

  // Sesión 2: Asignada a Carlos (driver3)
  const session2 = await prisma.session.create({
    data: {
      userId: driver3.id,
      parkingSpaceId: spaces[1].id, 
      entryTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      exitTime: new Date(now.getTime() - 21 * 60 * 60 * 1000),
      durationMins: 180,
      amount: 60,
      status: 'COMPLETED',
    }
  });
  await prisma.payment.create({
    data: {
      sessionId: session2.id,
      userId: driver3.id,
      amount: 60,
      status: 'PAID',
      method: 'WALLET'
    }
  });

  // Sesiones Activas para probar el simulador de pagos (Se asignan a conductor2 y conductor3)
  
  // Sesión 3: Asignada a María (driver2)
  await prisma.session.create({
    data: {
      userId: driver2.id,
      parkingSpaceId: spaces[3].id, // SENSOR_B01 ('OCCUPIED')
      entryTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      status: 'ACTIVE',
    }
  });

  // Sesión 4: Asignada a Carlos (driver3)
  await prisma.session.create({
    data: {
      userId: driver3.id, 
      parkingSpaceId: spaces[4].id, // SENSOR_B02 ('OCCUPIED')
      entryTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      status: 'ACTIVE',
    }
  });

  console.log('✅ Seed completado con éxito');
  console.log(`   Admin: admin@parkiq.com / admin123`);
  console.log(`   Conductor 1 (LIMPIO): conductor@parkiq.com / driver123 (saldo: $100 MXN)`);
  console.log(`   Conductor 2 (Activa/Historial): conductor2@parkiq.com / driver123`);
  console.log(`   Conductor 3 (Activa/Historial): conductor3@parkiq.com / driver123`);
  console.log(`   Conductor 4 (DEUDOR): conductor4@parkiq.com / driver123 (saldo: -$50 MXN)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());