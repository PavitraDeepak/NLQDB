import mongoose from 'mongoose';

const queryResultSchema = new mongoose.Schema({
  auditQueryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuditQuery',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  rowCount: {
    type: Number,
    required: true,
    min: 0
  },
  metadata: {
    executionTime: Number,
    collection: String,
    queryType: String,
    cached: {
      type: Boolean,
      default: false
    }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// TTL index to automatically delete expired results
queryResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
queryResultSchema.index({ userId: 1, createdAt: -1 });

const QueryResult = mongoose.model('QueryResult', queryResultSchema);

export default QueryResult;
