import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create write streams for different log files
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

// Custom token for user ID
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

morgan.token('user-role', (req) => {
  return req.user?.role || 'none';
});

// Morgan format with user info
const logFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms - role: :user-role';

// Development logger (console)
export const devLogger = morgan('dev');

// Production logger (file)
export const prodLogger = morgan(logFormat, {
  stream: accessLogStream,
  skip: (req, res) => res.statusCode >= 400 // Only log successful requests
});

// Error logger
export const errorLogger = morgan(logFormat, {
  stream: errorLogStream,
  skip: (req, res) => res.statusCode < 400 // Only log errors
});

// Audit logger for query operations
export const auditLogger = (req, res, next) => {
  const start = Date.now();
  
  // Store original send
  const originalSend = res.send;
  
  res.send = function(data) {
    res.send = originalSend;
    
    // Log audit event for query operations
    if (req.path.includes('/translate') || req.path.includes('/execute')) {
      const duration = Date.now() - start;
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        userRole: req.user?.role,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        query: req.body?.userQuery || req.body?.mongoQueryId
      };
      
      fs.appendFileSync(
        path.join(logsDir, 'audit.log'),
        JSON.stringify(logEntry) + '\n'
      );
    }
    
    return res.send(data);
  };
  
  next();
};

// Custom logger utility
export class Logger {
  static info(message, meta = {}) {
    const entry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    };
    console.log(JSON.stringify(entry));
  }

  static error(message, error = null, meta = {}) {
    const entry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        ...error
      } : null,
      ...meta
    };
    console.error(JSON.stringify(entry));
    
    fs.appendFileSync(
      path.join(logsDir, 'error.log'),
      JSON.stringify(entry) + '\n'
    );
  }

  static warn(message, meta = {}) {
    const entry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    };
    console.warn(JSON.stringify(entry));
  }

  static debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const entry = {
        level: 'debug',
        timestamp: new Date().toISOString(),
        message,
        ...meta
      };
      console.debug(JSON.stringify(entry));
    }
  }
}
