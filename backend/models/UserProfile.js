const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
  {
    // Unique wallet address identifier
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    // Display information
    displayName: {
      type: String,
      trim: true
    },

    avatar: {
      type: String,
      default: null
    },

    username: {
      type: String,
      sparse: true,
      index: true,
      trim: true
    },

    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },

    // Profile verification
    isVerified: {
      type: Boolean,
      default: false
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    // Profile completion status
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // User preferences
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      pushNotifications: {
        type: Boolean,
        default: true
      },
      marketingEmails: {
        type: Boolean,
        default: false
      },
      privateProfile: {
        type: Boolean,
        default: false
      },
      showOnlineStatus: {
        type: Boolean,
        default: true
      },
      allowMessages: {
        type: Boolean,
        default: true
      }
    },

    // Account settings
    settings: {
      language: {
        type: String,
        default: 'en'
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
      },
      currency: {
        type: String,
        default: 'USD'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      twoFactorEnabled: {
        type: Boolean,
        default: false
      }
    },

    // Social links
    socialLinks: {
      twitter: {
        type: String,
        default: null
      },
      discord: {
        type: String,
        default: null
      },
      website: {
        type: String,
        default: null
      },
      github: {
        type: String,
        default: null
      }
    },

    // Account status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      index: true
    },

    // Last profile update
    lastProfileUpdate: {
      type: Date,
      default: null
    },

    // Last login
    lastLogin: {
      type: Date,
      default: null
    },

    // Account creation stats
    totalPurchases: {
      type: Number,
      default: 0
    },

    totalSpent: {
      type: Number,
      default: 0
    },

    favoriteContentIds: {
      type: [Number],
      default: []
    },

    blockedUsers: {
      type: [String],
      default: [],
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'user_profiles'
  }
);

// Indexes for efficient queries
userProfileSchema.index({ address: 1 });
userProfileSchema.index({ username: 1 });
userProfileSchema.index({ status: 1, lastLogin: -1 });
userProfileSchema.index({ createdAt: -1 });

// Virtual for profile completion percentage
userProfileSchema.virtual('completenessPercentage').get(function () {
  let complete = 0;
  let total = 8;

  if (this.displayName) complete++;
  if (this.avatar) complete++;
  if (this.username) complete++;
  if (this.bio) complete++;
  if (this.socialLinks.twitter || this.socialLinks.github || this.socialLinks.website) complete++;
  if (this.isVerified) complete++;
  if (this.settings.language !== 'en') complete++;
  if (this.settings.twoFactorEnabled) complete++;

  return Math.round((complete / total) * 100);
});

// Pre-save middleware to update profile completeness
userProfileSchema.pre('save', function (next) {
  this.profileCompleteness = this.completenessPercentage;
  next();
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
