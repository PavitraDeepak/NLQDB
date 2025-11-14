import mongoose from 'mongoose';
import crypto from 'crypto';

const apiKeySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyPrefix: {
    type: String,
    required: true
  },
  hashedKey: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active',
    index: true
  },
  permissions: [{
    type: String,
    enum: ['query:translate', 'query:execute', 'schema:read', 'analytics:read']
  }],
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 60
    },
    requestsPerDay: {
      type: Number,
      default: 1000
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date
    },
    lastUsedIp: {
      type: String
    }
  },
  expiresAt: {
    type: Date
  },
  metadata: {
    description: String,
    environment: {
      type: String,
      enum: ['production', 'development', 'staging']
    }
  }
}, {
  timestamps: true
});

// Indexes
apiKeySchema.index({ organizationId: 1, status: 1 });
apiKeySchema.index({ key: 1 }, { unique: true });
apiKeySchema.index({ expiresAt: 1 }, { sparse: true });

// Statics
apiKeySchema.statics.generateKey = function() {
  // Format: nlqdb_live_xxxxxxxxxxxxx or nlqdb_test_xxxxxxxxxxxxx
  const prefix = process.env.NODE_ENV === 'production' ? 'nlqdb_live' : 'nlqdb_test';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = `${prefix}_${randomBytes}`;
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
  
  return {
    key,
    keyPrefix: `${prefix}_${randomBytes.substring(0, 8)}...`,
    hashedKey
  };
};

apiKeySchema.statics.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

apiKeySchema.statics.findByKey = async function(key) {
  const hashedKey = this.hashKey(key);
  return this.findOne({ 
    hashedKey, 
    status: 'active',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('organizationId');
};

// Methods
apiKeySchema.methods.revoke = function() {
  this.status = 'revoked';
  return this.save();
};

apiKeySchema.methods.recordUsage = async function(ip) {
  this.usage.totalRequests += 1;
  this.usage.lastUsedAt = new Date();
  if (ip) {
    this.usage.lastUsedIp = ip;
  }
  return this.save();
};

apiKeySchema.methods.hasPermission = function(permission) {
  if (!this.permissions || this.permissions.length === 0) {
    return true; // Default: all permissions
  }
  return this.permissions.includes(permission);
};

apiKeySchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

apiKeySchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    keyPrefix: this.keyPrefix,
    status: this.status,
    permissions: this.permissions,
    usage: this.usage,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
    metadata: this.metadata
  };
};

// Pre-save hook to check expiration
apiKeySchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
