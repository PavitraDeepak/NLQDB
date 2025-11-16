import Joi from 'joi';

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('admin', 'analyst', 'viewer').default('viewer')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  translateQuery: Joi.object({
    userQuery: Joi.string().min(1).max(5000).required(),
    context: Joi.object().default({})
  }),

  executeQuery: Joi.object({
    mongoQueryId: Joi.string().required(),
    options: Joi.object({
      limit: Joi.number().min(1).max(10000).default(100),
      skip: Joi.number().min(0).default(0)
    }).default({})
  })
};

/**
 * Validate request body against schema
 */
export const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({
        success: false,
        error: 'Validation schema not found'
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

/**
 * Sanitize query parameters
 */
export const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove potentially dangerous characters
        req.query[key] = req.query[key]
          .replace(/[<>]/g, '')
          .trim();
      }
    });
  }
  next();
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format'
      });
    }
    
    next();
  };
};

/**
 * Prevent NoSQL injection attempts
 */
export const preventNoSQLInjection = (req, res, next) => {
  const allowlistedPaths = [
    '/api/chat/execute',
    '/api/chat/preview',
    '/api/chat/replay',
    '/api/chat/result',
    '/api/chat/history'
  ];

  const skipTranslationCheck = allowlistedPaths.some((path) => req.path.startsWith(path));

  const checkForInjection = (value, path = []) => {
    if (value === null || value === undefined) {
      return false;
    }

    // Skip scanning trusted translation payloads that contain Mongo operators by design
    if (skipTranslationCheck && path[0] === 'translation') {
      return false;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return false;
    }

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (checkForInjection(value[index], path)) {
          return true;
        }
      }
      return false;
    }

    if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (typeof key === 'string' && key.startsWith('$')) {
          return true;
        }

        const nextPath = path.length === 0 ? [key] : [...path, key];
        if (checkForInjection(value[key], nextPath)) {
          return true;
        }
      }
    }

    return false;
  };

  if (
    checkForInjection(req.body) ||
    checkForInjection(req.query) ||
    checkForInjection(req.params)
  ) {
    console.warn('Blocked request due to potential NoSQL injection', {
      path: req.originalUrl,
      method: req.method
    });
    return res.status(400).json({
      success: false,
      error: 'Potentially malicious input detected'
    });
  }

  next();
};
