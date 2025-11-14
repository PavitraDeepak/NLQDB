import mongoose from 'mongoose';
import { Logger } from '../middlewares/logger.js';

/**
 * Connect to MongoDB
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      auth: {
        username: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD
      }
    });

    Logger.info('MongoDB connected', {
      host: conn.connection.host,
      database: conn.connection.name
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      Logger.error('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      Logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      Logger.info('MongoDB connection closed');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    Logger.error('MongoDB connection failed', error);
    process.exit(1);
  }
};

/**
 * Check database health
 */
export const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: states[state],
      connected: state === 1
    };
  } catch (error) {
    return {
      status: 'error',
      connected: false,
      error: error.message
    };
  }
};
