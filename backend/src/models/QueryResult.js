import mongoose from 'mongoose';

const queryResultSchema = new mongoose.Schema({
  executionId: {
    type: String,
    required: true,
    index: true
  },
  translationId: {
    type: String,
    index: true,
    default: null
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DatabaseConnection',
    index: true,
    default: null
  },
  auditQueryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuditQuery',
    index: true,
    default: null
  },
  query: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  explain: {
    type: String,
    default: ''
  },
  results: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  rowCount: {
    type: Number,
    default: 0,
    min: 0
  },
  executionTime: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'preview'],
    default: 'success'
  },
  truncated: {
    type: Boolean,
    default: false
  },
  cached: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  error: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: true
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Mirror data field for backward compatibility
queryResultSchema.pre('save', function mirrorData() {
  if (!this.data && this.results) {
    this.data = this.results;
  }
});

// TTL index to automatically delete expired results
queryResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
queryResultSchema.index({ userId: 1, createdAt: -1 });
queryResultSchema.index({ organizationId: 1, createdAt: -1 });
queryResultSchema.index({ translationId: 1, createdAt: -1 });

const QueryResult = mongoose.model('QueryResult', queryResultSchema);

export default QueryResult;
