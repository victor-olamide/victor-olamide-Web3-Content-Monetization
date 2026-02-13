const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  preferredContentTypes: { type: [String], default: [] },
  preferredCreators: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  minPrice: { type: Number },
  maxPrice: { type: Number }
}, { timestamps: true });

userPreferenceSchema.index({ userId: 1 });

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
