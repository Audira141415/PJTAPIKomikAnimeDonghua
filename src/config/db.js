const mongoose = require('mongoose');
const logger = require('./logger');
const { env } = require('./env');

const connectDB = async () => {
  try {
    if (!env.MONGO_URI) {
      logger.warn('MONGO_URI not configured. Starting without MongoDB. API will return errors.');
      return false;
    }
    const conn = await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    logger.warn(`MongoDB connection error: ${error.message}. Starting server without database connectivity.`);
    // Return false instead of exiting - allows dev server to start for UI testing
    return false;
  }
};

module.exports = { connectDB };
