import mongoose from 'mongoose';
import { Logger } from '../middlewares/logger.js';

/**
 * Connect to MongoDB
 */
export const connectDB = async () => {
  try {
    // For cloud providers (MongoDB Atlas), credentials are in the URI
    // Only use auth object if MONGO_USER is provided and URI doesn't contain credentials
    const mongoUri = process.env.MONGO_URI;
    const hasCredentialsInUri = mongoUri.includes('@') || mongoUri.startsWith('mongodb+srv://');
    
    const connectionOptions = {};
    
    // Only add auth if separate credentials are provided and not in URI
    if (process.env.MONGO_USER && process.env.MONGO_PASSWORD && !hasCredentialsInUri) {
      connectionOptions.auth = {
        username: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD
      };
    }
    
    const conn = await mongoose.connect(mongoUri, connectionOptions);

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
