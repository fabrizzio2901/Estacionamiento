require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes      = require('./routes/auth');
const spacesRoutes    = require('./routes/spaces');
const sessionsRoutes  = require('./routes/sessions');
const adminRoutes     = require('./routes/admin');
const sensorRoutes    = require('./routes/sensors');
const paymentsRoutes  = require('./routes/payments');
const reportsRoutes   = require('./routes/reports');
const pricingRoutes   = require('./routes/pricing');
const qrRoutes        = require('./routes/qr');

const { initMQTT } = require('./services/mqttService');

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Stripe webhook necesita el body RAW — debe ir ANTES de express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.set('io', io);
app.set('prisma', prisma);

// Rutas
app.use('/api/auth',     authRoutes);
app.use('/api/spaces',   spacesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/sensors',  sensorRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports',  reportsRoutes);
app.use('/api/pricing',  pricingRoutes);
app.use('/api/qr',       qrRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Cliente conectado: ${socket.id}`);
  prisma.parkingSpace.findMany().then((spaces) => {
    socket.emit('initialState', spaces);
  });
  socket.on('disconnect', () => {
    console.log(`[Socket] Cliente desconectado: ${socket.id}`);
  });
});

if (process.env.MQTT_BROKER_URL) {
  initMQTT(io, prisma);
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`\n🚗 Servidor ParkIQ v2 en http://localhost:${PORT}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ configurado' : '⚠️  no configurado'}`);
  console.log(`📡 Socket.io listo\n`);
});
