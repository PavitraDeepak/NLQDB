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
  const checkForInjection = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        // Check for MongoDB operators in keys
        if (key.startsWith('$')) {
          return true;
        }
        
        // Recursively check nested objects
        if (typeof obj[key] === 'object') {
          if (checkForInjection(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Check body, query, and params
  if (
    checkForInjection(req.body) ||
    checkForInjection(req.query) ||
    checkForInjection(req.params)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Potentially malicious input detected'
    });
  }

  next();
};
