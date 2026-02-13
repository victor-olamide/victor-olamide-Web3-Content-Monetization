const UserPreference = require('../models/UserPreference');

async function seedSamplePrefs() {
  const samples = [
    { userId: 'user1', preferredContentTypes: ['video'], preferredCreators: ['creator1'], keywords: ['blockchain', 'nft'] },
    { userId: 'user2', preferredContentTypes: ['article'], preferredCreators: ['creator2'], keywords: ['guide', 'how-to'] }
  ];
  for (const s of samples) {
    await UserPreference.updateOne({ userId: s.userId }, { $set: s }, { upsert: true });
  }
}

module.exports = { seedSamplePrefs };
