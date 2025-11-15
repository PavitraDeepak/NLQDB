import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'],
    default: 'active'
  },
  // Stripe data
  stripeSubscriptionId: {
    type: String,
    sparse: true
  },
  stripePriceId: {
    type: String
  },
  stripeCustomerId: {
    type: String
  },
  // Billing period
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  canceledAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  // Trial
  trialStart: {
    type: Date
  },
  trialEnd: {
    type: Date
  },
  // Pricing
  amount: {
    type: Number // in cents
  },
  currency: {
    type: String,
    default: 'usd'
  },
  interval: {
    type: String,
    enum: ['month', 'year'],
    default: 'month'
  },
  // History
  history: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'canceled', 'renewed', 'upgraded', 'downgraded']
    },
    fromPlan: String,
    toPlan: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ organizationId: 1, status: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Methods
subscriptionSchema.methods.isActive = function() {
  return ['active', 'trialing'].includes(this.status);
};

subscriptionSchema.methods.isInTrial = function() {
  if (!this.trialEnd) return false;
  return this.status === 'trialing' && new Date() < this.trialEnd;
};

subscriptionSchema.methods.cancel = async function(immediately = false) {
  if (immediately) {
    this.status = 'canceled';
    this.canceledAt = new Date();
    this.endedAt = new Date();
  } else {
    this.cancelAtPeriodEnd = true;
    this.canceledAt = new Date();
  }
  
  this.history.push({
    action: 'canceled',
    fromPlan: this.plan,
    timestamp: new Date(),
    metadata: { immediately }
  });
  
  return this.save();
};

subscriptionSchema.methods.upgrade = async function(newPlan, stripePriceId) {
  const oldPlan = this.plan;
  this.plan = newPlan;
  this.stripePriceId = stripePriceId;
  
  this.history.push({
    action: 'upgraded',
    fromPlan: oldPlan,
    toPlan: newPlan,
    timestamp: new Date()
  });
  
  return this.save();
};

subscriptionSchema.methods.downgrade = async function(newPlan, stripePriceId) {
  const oldPlan = this.plan;
  this.plan = newPlan;
  this.stripePriceId = stripePriceId;
  
  this.history.push({
    action: 'downgraded',
    fromPlan: oldPlan,
    toPlan: newPlan,
    timestamp: new Date()
  });
  
  return this.save();
};

subscriptionSchema.methods.renew = async function(periodStart, periodEnd) {
  this.currentPeriodStart = periodStart;
  this.currentPeriodEnd = periodEnd;
  this.status = 'active';
  
  this.history.push({
    action: 'renewed',
    timestamp: new Date(),
    metadata: { periodStart, periodEnd }
  });
  
  return this.save();
};

// Statics
subscriptionSchema.statics.findActiveByOrganization = function(organizationId) {
  return this.findOne({
    organizationId,
    status: { $in: ['active', 'trialing'] }
  });
};

subscriptionSchema.statics.findByStripeId = function(stripeSubscriptionId) {
  return this.findOne({ stripeSubscriptionId });
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
