import mongoose from 'mongoose';

const auditQuerySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: ['translation', 'execution'],
    default: 'translation'
  },
  translationId: {
    type: String,
    index: true,
    default: null
  },
  userQuery: {
    type: String,
    required: [true, 'User query text is required'],
    maxlength: [5000, 'Query text cannot exceed 5000 characters']
  },
  generatedQuery: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Generated query is required']
  },
  queryType: {
    type: String,
    enum: ['find', 'aggregate'],
    required: true
  },
  collection: {
    type: String,
    required: [true, 'Collection name is required']
  },
  executed: {
    type: Boolean,
    default: false
  },
  executionTime: {
    type: Number,
    default: null
  },
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QueryResult',
    default: null
  },
  resultCount: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  safetyPassed: {
    type: Boolean,
    required: true
  },
  safetyReason: {
    type: String,
    default: ''
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  explain: {
    type: String,
    maxlength: [2000, 'Explanation cannot exceed 2000 characters']
  },
  requiresIndexes: {
    type: [String],
    default: []
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  success: {
    type: Boolean,
    default: true
  },
  error: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Compound indexes for common queries
auditQuerySchema.index({ userId: 1, timestamp: -1 });
auditQuerySchema.index({ collection: 1, timestamp: -1 });
auditQuerySchema.index({ executed: 1, safetyPassed: 1 });
auditQuerySchema.index({ timestamp: -1 });
auditQuerySchema.index({ organizationId: 1, createdAt: -1 });
auditQuerySchema.index({ translationId: 1 });

const AuditQuery = mongoose.model('AuditQuery', auditQuerySchema);

export default AuditQuery;
