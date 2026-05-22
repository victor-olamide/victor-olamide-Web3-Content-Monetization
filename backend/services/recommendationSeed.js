const UserPreference = require('../models/UserPreference');
const ViewingHistory = require('../models/ViewingHistory');
const Content = require('../models/Content');

async function seedSamplePrefs() {
  const samples = [
    {
      userId: 'user1',
      preferredContentTypes: ['video', 'article'],
      preferredCreators: ['creator1', 'creator2'],
      keywords: ['blockchain', 'nft', 'web3'],
      minPrice: 0,
      maxPrice: 50
    },
    {
      userId: 'user2',
      preferredContentTypes: ['article', 'music'],
      preferredCreators: ['creator3'],
      keywords: ['guide', 'how-to', 'tutorial'],
      minPrice: 0,
      maxPrice: 25
    },
    {
      userId: 'user3',
      preferredContentTypes: ['video'],
      preferredCreators: ['creator1', 'creator4'],
      keywords: ['gaming', 'esports', 'streaming'],
      minPrice: 5,
      maxPrice: 100
    }
  ];

  for (const s of samples) {
    await UserPreference.updateOne({ userId: s.userId }, { $set: s }, { upsert: true });
  }

  console.log('Seeded user preferences');
}

async function seedViewingHistory() {
  try {
    // Get some content to reference
    const contents = await Content.find({}).limit(10).lean();
    if (contents.length === 0) {
      console.log('No content found for seeding viewing history');
      return;
    }

    const viewingSamples = [
      // User 1 viewing history
      {
        userId: 'user1',
        contentId: contents[0]?.contentId || 1,
        contentType: 'video',
        creator: 'creator1',
        title: 'Blockchain Basics',
        viewDuration: 300,
        completionRate: 100,
        liked: true
      },
      {
        userId: 'user1',
        contentId: contents[1]?.contentId || 2,
        contentType: 'article',
        creator: 'creator2',
        title: 'NFT Guide',
        viewDuration: 180,
        completionRate: 90,
        liked: false
      },
      // User 2 viewing history
      {
        userId: 'user2',
        contentId: contents[2]?.contentId || 3,
        contentType: 'article',
        creator: 'creator3',
        title: 'Tutorial: Smart Contracts',
        viewDuration: 240,
        completionRate: 85,
        liked: true
      },
      // User 3 viewing history
      {
        userId: 'user3',
        contentId: contents[0]?.contentId || 1,
        contentType: 'video',
        creator: 'creator1',
        title: 'Gaming in Web3',
        viewDuration: 450,
        completionRate: 95,
        liked: true,
        shared: true
      }
    ];

    for (const sample of viewingSamples) {
      await ViewingHistory.updateOne(
        { userId: sample.userId, contentId: sample.contentId },
        { $set: sample },
        { upsert: true }
      );
    }

    console.log('Seeded viewing history');
  } catch (error) {
    console.error('Error seeding viewing history:', error);
  }
}

async function seedAll() {
  await seedSamplePrefs();
  await seedViewingHistory();
  console.log('All recommendation data seeded');
}

module.exports = {
  seedSamplePrefs,
  seedViewingHistory,
  seedAll
};
