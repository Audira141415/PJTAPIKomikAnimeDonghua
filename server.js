require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { env } = require('./src/config/env');
const logger = require('./src/config/logger');

const start = async () => {
  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.warn('Server starting without database connectivity. API endpoints will return errors.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    if (!dbConnected) {
      logger.warn('💡 To use API endpoints, configure MongoDB via MONGO_URI in .env or start Docker containers.');
      logger.warn('   For now, you can access the endpoint explorer at http://localhost:5000/');
    }
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    server.close(async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed. Exiting.');
      process.exit(0);
    });
    // Force exit if connections linger beyond 10 s
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    shutdown('uncaughtException');
  });
};

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
