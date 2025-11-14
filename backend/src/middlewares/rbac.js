// Role-based access control middleware

/**
 * Check if user has one of the required roles
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Check if user is admin or analyst
 */
export const requireAnalyst = requireRole('admin', 'analyst');

/**
 * Check if user is any authenticated user (admin, analyst, or viewer)
 */
export const requireAuth = requireRole('admin', 'analyst', 'viewer');

/**
 * Field-level access control for sensitive data
 */
export const filterSensitiveFields = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to filter sensitive fields based on role
  res.json = function(data) {
    if (!req.user) {
      return originalJson(data);
    }

    // Viewer role restrictions
    if (req.user.role === 'viewer') {
      data = removeSensitiveFields(data, ['salary', 'ssn', 'password', 'apiKey']);
    }

    return originalJson(data);
  };

  next();
};

/**
 * Recursively remove sensitive fields from data
 */
function removeSensitiveFields(data, fields) {
  if (Array.isArray(data)) {
    return data.map(item => removeSensitiveFields(item, fields));
  }

  if (data && typeof data === 'object') {
    const cleaned = { ...data };
    
    fields.forEach(field => {
      if (field in cleaned) {
        cleaned[field] = '[REDACTED]';
      }
    });

    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'object') {
        cleaned[key] = removeSensitiveFields(cleaned[key], fields);
      }
    });

    return cleaned;
  }

  return data;
}
