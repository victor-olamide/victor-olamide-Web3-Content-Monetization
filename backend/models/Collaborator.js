const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema({
  contentId: { type: Number, required: true },
  address: { type: String, required: true },
  royaltyPercentage: { type: Number, required: true, min: 0, max: 100 },
  name: { type: String, default: null },
  role: { type: String, enum: ['co-creator', 'editor', 'contributor', 'producer'], default: 'contributor' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure no duplicate collaborators per content
collaboratorSchema.index({ contentId: 1, address: 1 }, { unique: true });

module.exports = mongoose.model('Collaborator', collaboratorSchema);
