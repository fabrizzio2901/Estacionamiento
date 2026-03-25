const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed v2...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@parking.mx' },
    update: {},
    create: { email: 'admin@parking.mx', password: adminPassword, name: 'Administrador', role: 'ADMIN' },
  });

  const userPassword = await bcrypt.hash('user123', 12);
  await prisma.user.upsert({
    where: { email: 'conductor@parking.mx' },
    update: {},
    create: { email: 'conductor@parking.mx', password: userPassword, name: 'Juan Conductor', role: 'DRIVER' },
  });

  console.log('✅ Usuarios creados');

  for (const zone of ['A', 'B']) {
    for (let i = 1; i <= 10; i++) {
      const number = zone === 'A' ? i : i + 10;
      await prisma.parkingSpace.upsert({
        where: { number },
        update: {},
        create: { number, sensorId: `SENSOR_${zone}${String(i).padStart(2, '0')}`, zone, floor: 1 },
      });
    }
  }
  console.log('✅ 20 cajones creados');

  // Tarifa por defecto
  const existingRule = await prisma.pricingRule.findFirst({ where: { isActive: true } });
  if (!existingRule) {
    await prisma.pricingRule.create({
      data: { name: 'Tarifa estándar', type: 'HOURLY', pricePerHour: 20, isActive: true },
    });
    console.log('✅ Tarifa inicial creada: $20 MXN/hora');
  }

  console.log('\n📋 Credenciales:');
  console.log('  Admin:     admin@parking.mx / admin123');
  console.log('  Conductor: conductor@parking.mx / user123');
  console.log('\n🚗 Seed v2 completado!');
}

main()
  .catch(e => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
