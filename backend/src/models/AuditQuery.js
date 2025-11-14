import mongoose from 'mongoose';

const auditQuerySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
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
    required: [true, 'Collection name is required'],
    index: true
  },
  executed: {
    type: Boolean,
    default: false,
    index: true
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
    default: Date.now,
    index: true
  },
  safetyPassed: {
    type: Boolean,
    required: true,
    index: true
  },
  safetyReason: {
    type: String,
    default: ''
  },
  explain: {
    type: String,
    maxlength: [2000, 'Explanation cannot exceed 2000 characters']
  },
  requiresIndexes: {
    type: [String],
    default: []
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
  timestamps: true
});

// Compound indexes for common queries
auditQuerySchema.index({ userId: 1, timestamp: -1 });
auditQuerySchema.index({ collection: 1, timestamp: -1 });
auditQuerySchema.index({ executed: 1, safetyPassed: 1 });
auditQuerySchema.index({ timestamp: -1 });

const AuditQuery = mongoose.model('AuditQuery', auditQuerySchema);

export default AuditQuery;
