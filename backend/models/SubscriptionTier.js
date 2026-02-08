const mongoose = require('mongoose');

const subscriptionTierSchema = new mongoose.Schema({
  // Basic Information
  creatorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Creator', 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
    description: 'Tier name (e.g., "Basic", "Premium", "Exclusive")'
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 500,
    description: 'Detailed tier description and benefits'
  },
  icon: { 
    type: String, 
    default: null,
    description: 'URL to tier icon/image'
  },
  
  // Pricing Information
  price: { 
    type: Number, 
    required: true,
    min: 0,
    description: 'Monthly subscription price in USD'
  },
  currency: { 
    type: String, 
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    description: 'Currency code for pricing'
  },
  billingCycle: { 
    type: String, 
    default: 'monthly',
    enum: ['monthly', 'quarterly', 'annual'],
    description: 'Billing frequency'
  },
  
  // Tier Positioning
  position: { 
    type: Number, 
    required: true,
    min: 0,
    description: 'Display order (0=first/cheapest, higher=premium)'
  },
  isPopular: { 
    type: Boolean, 
    default: false,
    index: true,
    description: 'Mark as popular/recommended tier'
  },
  
  // Benefits & Features
  benefits: [{
    feature: { 
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
      description: 'Feature name (e.g., "Exclusive Videos", "Early Access")'
    },
    description: {
      type: String,
      default: null,
      maxlength: 300,
      description: 'Additional details about the feature'
    },
    included: {
      type: Boolean,
      default: true,
      description: 'Whether this feature is included in this tier'
    }
  }],
  
  // Content Access
  accessLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
    description: 'Access level (1=basic, higher=more content access)'
  },
  contentAccess: {
    type: [String],
    enum: ['all', 'exclusive', 'early-access', 'behind-paywall', 'bonus-content'],
    default: ['all'],
    description: 'Types of content accessible at this tier'
  },
  downloadLimit: {
    type: Number,
    default: null,
    min: 0,
    description: 'Max downloads per month (null=unlimited)'
  },
  
  // Subscriber Limits & Restrictions
  maxSubscribers: {
    type: Number,
    default: null,
    min: 1,
    description: 'Maximum number of subscribers allowed (null=unlimited)'
  },
  currentSubscriberCount: {
    type: Number,
    default: 0,
    min: 0,
    index: true,
    description: 'Current active subscriber count'
  },
  waitlistEnabled: {
    type: Boolean,
    default: false,
    description: 'Enable waitlist when tier is full'
  },
  
  // Upgrade/Downgrade Behavior
  allowDowngrade: {
    type: Boolean,
    default: true,
    description: 'Can subscribers downgrade from this tier'
  },
  allowUpgrade: {
    type: Boolean,
    default: true,
    description: 'Can subscribers upgrade to this tier'
  },
  upgradeDiscount: {
    type: Number,
    default: null,
    min: 0,
    max: 100,
    description: 'Discount percentage for upgrades (0-100)'
  },
  
  // Trial & Incentives
  trialDays: {
    type: Number,
    default: 0,
    min: 0,
    max: 365,
    description: 'Free trial period in days'
  },
  introductoryPrice: {
    price: { type: Number, default: null, min: 0 },
    duration: { type: Number, default: null, min: 1 }, // in months
    description: 'First N months at reduced price'
  },
  
  // Status & Visibility
  isActive: {
    type: Boolean,
    default: true,
    index: true,
    description: 'Whether this tier is available for purchase'
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true,
    description: 'Whether to display this tier publicly'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public',
    description: 'Public=visible to all, Private=invite only, Hidden=creator only'
  },
  
  // Analytics & Tracking
  subscriberCount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total lifetime subscribers'
  },
  revenueTotal: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total revenue from this tier'
  },
  averageChurn: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    description: 'Average churn rate percentage'
  },
  
  // Metadata & Customization
  customFields: {
    type: Map,
    of: String,
    default: new Map(),
    description: 'Creator-specific custom fields'
  },
  metadata: {
    color: { type: String, default: null }, // Hex color
    emoji: { type: String, default: null }, // Unicode emoji
    tags: [String],
    custom: {}
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date,
    default: null
  }
});

// Compound indexes for efficient querying
subscriptionTierSchema.index({ creatorId: 1, isActive: 1 });
subscriptionTierSchema.index({ creatorId: 1, position: 1 });
subscriptionTierSchema.index({ creatorId: 1, isVisible: 1 });
subscriptionTierSchema.index({ creatorId: 1, visibility: 1 });
subscriptionTierSchema.index({ isPopular: 1, isActive: 1 });
subscriptionTierSchema.index({ createdAt: -1 });
subscriptionTierSchema.index({ revenueTotal: -1 });

// Virtual properties
subscriptionTierSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

subscriptionTierSchema.virtual('effectivePrice').get(function() {
  if (this.introductoryPrice && this.introductoryPrice.price !== null) {
    return this.introductoryPrice.price;
  }
  return this.price;
});

subscriptionTierSchema.virtual('isFull').get(function() {
  if (this.maxSubscribers === null) return false;
  return this.currentSubscriberCount >= this.maxSubscribers;
});

subscriptionTierSchema.virtual('availableSlots').get(function() {
  if (this.maxSubscribers === null) return Infinity;
  return Math.max(0, this.maxSubscribers - this.currentSubscriberCount);
});

subscriptionTierSchema.virtual('isTrialAvailable').get(function() {
  return this.trialDays > 0;
});

subscriptionTierSchema.virtual('tierCategory').get(function() {
  if (this.position === 0) return 'entry-level';
  if (this.position === 1) return 'standard';
  if (this.position === 2) return 'premium';
  return 'premium-plus';
});

// Methods
subscriptionTierSchema.methods.canUpgradeTo = function() {
  return this.allowUpgrade && this.isActive;
};

subscriptionTierSchema.methods.canDowngradeFrom = function() {
  return this.allowDowngrade;
};

subscriptionTierSchema.methods.isAvailableForPurchase = function() {
  return this.isActive && this.isVisible && !this.isFull;
};

subscriptionTierSchema.methods.addBenefit = function(feature, description = null, included = true) {
  this.benefits.push({ feature, description, included });
  return this;
};

subscriptionTierSchema.methods.removeBenefit = function(featureIndex) {
  if (featureIndex >= 0 && featureIndex < this.benefits.length) {
    this.benefits.splice(featureIndex, 1);
  }
  return this;
};

subscriptionTierSchema.methods.updateSubscriberCount = function(delta = 1) {
  this.currentSubscriberCount = Math.max(0, this.currentSubscriberCount + delta);
  this.updatedAt = new Date();
  return this;
};

subscriptionTierSchema.methods.addRevenue = function(amount) {
  if (amount > 0) {
    this.revenueTotal += amount;
    this.updatedAt = new Date();
  }
  return this;
};

subscriptionTierSchema.methods.setAsPopular = function(isPopular = true) {
  this.isPopular = isPopular;
  this.updatedAt = new Date();
  return this;
};

subscriptionTierSchema.methods.setVisibility = function(visibility) {
  if (['public', 'private', 'hidden'].includes(visibility)) {
    this.visibility = visibility;
    this.isVisible = visibility !== 'hidden';
    this.updatedAt = new Date();
  }
  return this;
};

subscriptionTierSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  this.updatedAt = new Date();
  return this;
};

subscriptionTierSchema.methods.getFeatureComparison = function(otherTier) {
  const comparison = {
    thisFeatures: this.benefits.filter(b => b.included).map(b => b.feature),
    otherFeatures: otherTier.benefits.filter(b => b.included).map(b => b.feature),
    exclusive: [],
    missing: []
  };
  
  comparison.exclusive = comparison.thisFeatures.filter(f => !comparison.otherFeatures.includes(f));
  comparison.missing = comparison.otherFeatures.filter(f => !comparison.thisFeatures.includes(f));
  
  return comparison;
};

// Middleware
subscriptionTierSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

subscriptionTierSchema.post('save', function(doc) {
  // Trigger any hooks if needed
});

module.exports = mongoose.model('SubscriptionTier', subscriptionTierSchema);
