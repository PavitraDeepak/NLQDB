import mongoose from 'mongoose';
import crypto from 'crypto';

const databaseConnectionSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['postgresql', 'mysql', 'sqlserver', 'mongodb', 'mariadb', 'oracle', 'redis', 'cassandra'],
    required: true
  },
  // Connection method: 'uri' for NoSQL (MongoDB, Redis) or 'standard' for SQL
  connectionMethod: {
    type: String,
    enum: ['standard', 'uri'],
    default: 'standard'
  },
  // For URI-based connections (MongoDB, Redis, etc.)
  encryptedUri: {
    type: String,
    select: false
  },
  uriEncryptionIV: {
    type: String,
    select: false
  },
  // For standard connections (SQL databases)
  host: {
    type: String
  },
  port: {
    type: Number
  },
  database: {
    type: String
  },
  username: {
    type: String
  },
  // Encrypted credentials
  encryptedPassword: {
    type: String,
    select: false
  },
  encryptionIV: {
    type: String,
    select: false
  },
  // SSL/TLS options
  ssl: {
    enabled: {
      type: Boolean,
      default: false
    },
    rejectUnauthorized: {
      type: Boolean,
      default: true
    },
    ca: String,
    cert: String,
    key: String
  },
  // Connection pooling settings
  connectionOptions: {
    maxConnections: {
      type: Number,
      default: 5,
      min: 1,
      max: 20
    },
    connectionTimeout: {
      type: Number,
      default: 30000
    },
    idleTimeout: {
      type: Number,
      default: 10000
    }
  },
  // Read-only enforcement
  readOnly: {
    type: Boolean,
    default: true
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'testing', 'inactive', 'error'],
    default: 'testing'
  },
  lastTestedAt: {
    type: Date
  },
  lastTestStatus: {
    success: Boolean,
    message: String,
    error: String
  },
  // Schema cache
  schemaCache: {
    lastUpdated: Date,
    tables: [{
      name: { type: String, required: true },
      schema: { type: String, required: true },
      columns: {
        type: [{
          name: { type: String, required: true },
          type: { type: String, required: true },
          nullable: { type: Boolean, default: true },
          primaryKey: { type: Boolean, default: false },
          foreignKey: { type: Boolean, default: false }
        }],
        default: []
      }
    }]
  },
  // Usage tracking
  usage: {
    totalQueries: {
      type: Number,
      default: 0
    },
    lastUsedAt: Date,
    lastQueryAt: Date
  },
  // Metadata
  description: {
    type: String,
    maxlength: 500
  },
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
databaseConnectionSchema.index({ organizationId: 1, status: 1 });
databaseConnectionSchema.index({ organizationId: 1, name: 1 }, { unique: true });

// Encryption key from environment - MUST be 32 bytes (64 hex characters)
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Validate encryption key
if (!process.env.DB_ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: DB_ENCRYPTION_KEY not set in environment. Using generated key. Encrypted connections will fail after restart!');
} else if (Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  throw new Error('DB_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
} else {
  console.log('✅ Database encryption key loaded from environment');
}

// Methods
databaseConnectionSchema.methods.encryptPassword = function(password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  this.encryptedPassword = encrypted;
  this.encryptionIV = iv.toString('hex');
};

databaseConnectionSchema.methods.encryptUri = function(uri) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let encrypted = cipher.update(uri, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  this.encryptedUri = encrypted;
  this.uriEncryptionIV = iv.toString('hex');
};

databaseConnectionSchema.methods.decryptPassword = function() {
  if (!this.encryptedPassword || !this.encryptionIV) {
    return null;
  }
  
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(this.encryptionIV, 'hex')
    );
    
    let decrypted = decipher.update(this.encryptedPassword, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt password. The encryption key may have changed. Please delete and recreate this connection. Error: ${error.message}`);
  }
};

databaseConnectionSchema.methods.decryptUri = function() {
  if (!this.encryptedUri || !this.uriEncryptionIV) {
    return null;
  }
  
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(this.uriEncryptionIV, 'hex')
    );
    
    let decrypted = decipher.update(this.encryptedUri, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt URI. The encryption key may have changed. Please delete and recreate this connection. Error: ${error.message}`);
  }
};

databaseConnectionSchema.methods.getConnectionString = function() {
  // URI-based connection (NoSQL like MongoDB, Redis)
  if (this.connectionMethod === 'uri') {
    return this.decryptUri();
  }
  
  // Standard connection (SQL databases)
  const password = this.decryptPassword();
  
  switch (this.type) {
    case 'postgresql':
      return `postgresql://${this.username}:${encodeURIComponent(password)}@${this.host}:${this.port}/${this.database}`;
    case 'mysql':
    case 'mariadb':
      return `mysql://${this.username}:${encodeURIComponent(password)}@${this.host}:${this.port}/${this.database}`;
    case 'sqlserver':
      return `mssql://${this.username}:${encodeURIComponent(password)}@${this.host}:${this.port}/${this.database}`;
    case 'mongodb':
      return `mongodb://${this.username}:${encodeURIComponent(password)}@${this.host}:${this.port}/${this.database}`;
    default:
      throw new Error(`Unsupported database type: ${this.type}`);
  }
};

databaseConnectionSchema.methods.getSafeInfo = function() {
  const info = {
    _id: this._id,  // Include MongoDB _id
    id: this._id,   // Also include id for convenience
    name: this.name,
    type: this.type,
    connectionMethod: this.connectionMethod,
    status: this.status,
    readOnly: this.readOnly,
    lastTestedAt: this.lastTestedAt,
    lastTestStatus: this.lastTestStatus,
    usage: this.usage,
    description: this.description,
    tags: this.tags,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
  
  // Only include standard connection fields if not using URI
  if (this.connectionMethod === 'standard') {
    info.host = this.host;
    info.port = this.port;
    info.database = this.database;
    info.username = this.username;
  }
  
  return info;
};

// Statics
databaseConnectionSchema.statics.findByOrganization = function(organizationId, includeInactive = false) {
  const query = { organizationId };
  if (!includeInactive) {
    query.status = { $in: ['active', 'testing'] };
  }
  return this.find(query);
};

databaseConnectionSchema.statics.findActiveByOrganization = function(organizationId) {
  return this.find({ organizationId, status: 'active' });
};

const DatabaseConnection = mongoose.model('DatabaseConnection', databaseConnectionSchema);

export default DatabaseConnection;
