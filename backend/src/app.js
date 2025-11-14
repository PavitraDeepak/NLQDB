import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './utils/database.js';
import routes from './routes/index.js';
import {
  devLogger,
  prodLogger,
  errorLogger,
  auditLogger,
  errorHandler,
  notFoundHandler,
  apiLimiter,
  sanitizeQuery,
  preventNoSQLInjection
} from './middlewares/index.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to database
await connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(devLogger);
} else {
  app.use(prodLogger);
  app.use(errorLogger);
}
app.use(auditLogger);

// Security middleware
app.use(sanitizeQuery);
app.use(preventNoSQLInjection);

// Rate limiting
app.use('/api', apiLimiter);

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NLQDB API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      schema: '/api/schema',
      tables: '/api/tables',
      translate: '/api/translate',
      execute: '/api/execute',
      history: '/api/history'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   NLQDB API Server Running            ║
  ║   Environment: ${process.env.NODE_ENV?.padEnd(23) || 'development'.padEnd(23)}║
  ║   Port: ${PORT.toString().padEnd(30)}║
  ║   URL: http://localhost:${PORT.toString().padEnd(17)}║
  ╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
