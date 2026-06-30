'use strict';
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const logger = require('./src/utils/logger');
const notificationService = require('./src/services/notificationService');
const { User, Role, Permission } = require('./src/models');

const PORT = parseInt(process.env.PORT) || 5000;

// ── HTTP Server ────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
// Socket.io accepts all origins in development (mirrors Express CORS policy).
// In production, replace `true` with an explicit allowlist.
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'first_name', 'last_name', 'email'],
    });
    if (!user || !user.is_active) return next(new Error('User not found or inactive'));

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  logger.info(`⚡  Socket connected: user ${userId} (${socket.id})`);

  // Join user-specific room for targeted notifications
  socket.join(`user:${userId}`);

  // Handle joining project rooms for collaborative updates
  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`);
    logger.info(`  Socket ${socket.id} joined project:${projectId}`);
  });

  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  // Real-time task updates broadcast to project room
  socket.on('task:update', (data) => {
    socket.to(`project:${data.project_id}`).emit('task:updated', data);
  });

  // Real-time scope change broadcast
  socket.on('scope:change', (data) => {
    socket.to(`project:${data.project_id}`).emit('scope:changed', data);
  });

  // Ping/pong for connection health
  socket.on('ping', () => socket.emit('pong', { time: Date.now() }));

  socket.on('disconnect', (reason) => {
    logger.info(`⚡  Socket disconnected: user ${userId} (${reason})`);
  });

  socket.on('error', (err) => {
    logger.error(`Socket error for user ${userId}: ${err.message}`);
  });
});

// Inject io into notification service for real-time push
notificationService.setSocketIO(io);

// ── Start Server ───────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      logger.info(`\n${'═'.repeat(55)}`);
      logger.info(`  🚀  ProHorizon Scope Tracker API`);
      logger.info(`  📡  Server:   http://localhost:${PORT}`);
      logger.info(`  📄  Swagger:  http://localhost:${PORT}/api/docs`);
      logger.info(`  🌱  Seed:     npm run seed`);
      logger.info(`  🏃  Env:      ${process.env.NODE_ENV}`);
      logger.info(`${'═'.repeat(55)}\n`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

// ── Graceful Shutdown ─────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed');
    const { sequelize } = require('./src/config/database');
    await sequelize.close();
    logger.info('Database connection closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

start();
