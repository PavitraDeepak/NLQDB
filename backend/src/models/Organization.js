import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  planStatus: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'canceled', 'suspended'],
    default: 'active'
  },
  // Stripe billing
  stripeCustomerId: {
    type: String,
    sparse: true
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true
  },
  stripePriceId: {
    type: String
  },
  subscriptionStartDate: {
    type: Date
  },
  subscriptionEndDate: {
    type: Date
  },
  trialEndsAt: {
    type: Date
  },
  // Usage tracking
  usage: {
    queriesThisMonth: {
      type: Number,
      default: 0
    },
    queriesLastReset: {
      type: Date,
      default: Date.now
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    tokensLastReset: {
      type: Date,
      default: Date.now
    },
    storageMB: {
      type: Number,
      default: 0
    },
    apiRequestsThisMonth: {
      type: Number,
      default: 0
    }
  },
  // Plan limits
  limits: {
    queriesPerMonth: {
      type: Number,
      default: 100
    },
    tokensPerMonth: {
      type: Number,
      default: 50000
    },
    maxTeamMembers: {
      type: Number,
      default: 3
    },
    maxApiKeys: {
      type: Number,
      default: 2
    },
    storageLimitMB: {
      type: Number,
      default: 100
    }
  },
  // Organization settings
  settings: {
    allowApiAccess: {
      type: Boolean,
      default: true
    },
    ipWhitelist: [{
      type: String
    }],
    webhookUrl: {
      type: String
    },
    customDomain: {
      type: String
    }
  },
  // Metadata
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  metadata: {
    industry: String,
    companySize: String,
    useCase: String
  }
}, {
  timestamps: true
});

// Indexes
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ ownerUserId: 1 });
organizationSchema.index({ stripeCustomerId: 1 }, { sparse: true });
organizationSchema.index({ status: 1 });

// Methods
organizationSchema.methods.canExecuteQuery = function() {
  if (this.plan === 'enterprise') return true;
  if (this.status !== 'active') return false;
  if (this.planStatus === 'suspended' || this.planStatus === 'canceled') return false;
  return this.usage.queriesThisMonth < this.limits.queriesPerMonth;
};

organizationSchema.methods.canUseTokens = function(tokensNeeded = 0) {
  if (this.plan === 'enterprise') return true;
  if (this.status !== 'active') return false;
  return (this.usage.tokensUsed + tokensNeeded) <= this.limits.tokensPerMonth;
};

organizationSchema.methods.incrementUsage = async function(usage = {}) {
  if (usage.queries) {
    this.usage.queriesThisMonth += usage.queries;
  }
  if (usage.tokens) {
    this.usage.tokensUsed += usage.tokens;
  }
  if (usage.apiRequests) {
    this.usage.apiRequestsThisMonth += usage.apiRequests;
  }
  if (usage.storageMB) {
    this.usage.storageMB += usage.storageMB;
  }
  return this.save();
};

organizationSchema.methods.resetMonthlyUsage = function() {
  this.usage.queriesThisMonth = 0;
  this.usage.tokensUsed = 0;
  this.usage.apiRequestsThisMonth = 0;
  this.usage.queriesLastReset = new Date();
  this.usage.tokensLastReset = new Date();
  return this.save();
};

organizationSchema.methods.updatePlan = function(plan, limits = {}) {
  this.plan = plan;
  
  // Set default limits based on plan
  const planDefaults = {
    free: {
      queriesPerMonth: 100,
      tokensPerMonth: 50000,
      maxTeamMembers: 3,
      maxApiKeys: 2,
      storageLimitMB: 100
    },
    pro: {
      queriesPerMonth: 5000,
      tokensPerMonth: 5000000,
      maxTeamMembers: 10,
      maxApiKeys: 10,
      storageLimitMB: 5000
    },
    enterprise: {
      queriesPerMonth: -1, // unlimited
      tokensPerMonth: -1,
      maxTeamMembers: -1,
      maxApiKeys: -1,
      storageLimitMB: -1
    }
  };
  
  this.limits = { ...planDefaults[plan], ...limits };
  return this.save();
};

// Statics
organizationSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' });
};

organizationSchema.statics.findByOwner = function(userId) {
  return this.find({ ownerUserId: userId, status: { $ne: 'deleted' } });
};

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
