const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const cdnService = require('../services/cdnService');
const cdnDeliveryService = require('../services/cdnDeliveryService');
const { CdnCacheEntry, CdnPurgeRequest, CdnAnalytics, CdnHealthCheck } = require('../models/CdnCache');
const Content = require('../models/Content');

describe('CDN Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await CdnCacheEntry.deleteMany({});
    await CdnPurgeRequest.deleteMany({});
    await CdnAnalytics.deleteMany({});
    await CdnHealthCheck.deleteMany({});
    await Content.deleteMany({});
  });

  describe('CDN Service Tests', () => {
    test('should add content to cache successfully', async () => {
      // Create test content
      const testContent = new Content({
        contentId: 1,
        title: 'Test Content',
        creator: 'test-creator',
        contentType: 'video',
        storage: {
          ipfs: { cid: 'QmTest123' },
          gaia: { hash: 'gaia-test-123' }
        },
        isRemoved: false
      });
      await testContent.save();

      const result = await cdnService.addToCache(testContent);

      expect(result.success).toBe(true);
      expect(result.cacheEntry).toBeDefined();
      expect(result.cacheEntry.contentId).toBe(1);
      expect(result.cacheEntry.status).toBe('cached');

      // Verify cache entry was created
      const cacheEntry = await CdnCacheEntry.findOne({ contentId: 1 });
      expect(cacheEntry).toBeTruthy();
      expect(cacheEntry.status).toBe('cached');
    });

    test('should handle cache addition failure gracefully', async () => {
      // Test with invalid content
      const result = await cdnService.addToCache(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should purge content from cache', async () => {
      // Create cache entry
      const cacheEntry = new CdnCacheEntry({
        contentId: 1,
        contentType: 'video',
        status: 'cached',
        cdnUrl: 'https://cdn.example.com/content/1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      await cacheEntry.save();

      const result = await cdnService.purgeContent([1], 'test');

      expect(result.success).toBe(true);
      expect(result.purgeRequest).toBeDefined();

      // Verify purge request was created
      const purgeRequest = await CdnPurgeRequest.findOne({ contentIds: [1] });
      expect(purgeRequest).toBeTruthy();
      expect(purgeRequest.reason).toBe('test');
    });

    test('should get analytics data', async () => {
      // Create analytics data
      const analytics = new CdnAnalytics({
        date: new Date(),
        period: 'daily',
        metrics: {
          totalRequests: 1000,
          cacheHits: 800,
          cacheMisses: 200,
          bytesServed: 1000000,
          averageResponseTime: 150
        }
      });
      await analytics.save();

      const result = await cdnService.getAnalytics('daily', new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('CDN Delivery Service Tests', () => {
    test('should deliver content via CDN when available', async () => {
      // Create test content
      const testContent = new Content({
        contentId: 1,
        title: 'Test Content',
        creator: 'test-creator',
        contentType: 'video',
        storage: {
          ipfs: { cid: 'QmTest123' },
          gaia: { hash: 'gaia-test-123' }
        },
        isRemoved: false
      });
      await testContent.save();

      // Create cache entry
      const cacheEntry = new CdnCacheEntry({
        contentId: 1,
        contentType: 'video',
        status: 'cached',
        cdnUrl: 'https://cdn.example.com/content/1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      await cacheEntry.save();

      const result = await cdnDeliveryService.deliverContent(testContent, {});

      expect(result.success).toBe(true);
      expect(result.deliveryMethod).toBe('cdn');
      expect(result.url).toBe('https://cdn.example.com/content/1');
    });

    test('should fallback to direct delivery when CDN unavailable', async () => {
      // Create test content without cache entry
      const testContent = new Content({
        contentId: 2,
        title: 'Test Content 2',
        creator: 'test-creator',
        contentType: 'video',
        storage: {
          ipfs: { cid: 'QmTest456' },
          gaia: { hash: 'gaia-test-456' }
        },
        isRemoved: false
      });
      await testContent.save();

      const result = await cdnDeliveryService.deliverContent(testContent, {});

      expect(result.success).toBe(true);
      expect(result.deliveryMethod).toBe('direct');
      expect(result.url).toBeDefined();
    });

    test('should check CDN health', async () => {
      const result = await cdnDeliveryService.checkCdnHealth();

      expect(result).toBeDefined();
      expect(typeof result.healthy).toBe('boolean');
      expect(result.timestamp).toBeDefined();
    });

    test('should get delivery statistics', async () => {
      // Create some cache entries with hits
      const cacheEntry1 = new CdnCacheEntry({
        contentId: 1,
        contentType: 'video',
        status: 'cached',
        hitCount: 100,
        bytesServed: 1000000,
        lastAccessed: new Date()
      });
      const cacheEntry2 = new CdnCacheEntry({
        contentId: 2,
        contentType: 'image',
        status: 'cached',
        hitCount: 50,
        bytesServed: 500000,
        lastAccessed: new Date()
      });
      await cacheEntry1.save();
      await cacheEntry2.save();

      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const result = await cdnDeliveryService.getDeliveryStats(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalRequests).toBe(150);
      expect(result.stats.totalBytes).toBe(1500000);
    });

    test('should warmup cache for content', async () => {
      // Create test content
      const testContent = new Content({
        contentId: 1,
        title: 'Test Content',
        creator: 'test-creator',
        contentType: 'video',
        storage: {
          ipfs: { cid: 'QmTest123' },
          gaia: { hash: 'gaia-test-123' }
        },
        isRemoved: false
      });
      await testContent.save();

      const result = await cdnDeliveryService.warmupCache([testContent]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle invalid content gracefully', async () => {
      const result = await cdnService.addToCache(null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle empty purge request', async () => {
      const result = await cdnService.purgeContent([], 'test');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle delivery of removed content', async () => {
      const removedContent = new Content({
        contentId: 3,
        title: 'Removed Content',
        creator: 'test-creator',
        contentType: 'video',
        isRemoved: true
      });
      await removedContent.save();

      const result = await cdnDeliveryService.deliverContent(removedContent, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple concurrent cache operations', async () => {
      const promises = [];
      for (let i = 1; i <= 10; i++) {
        const content = new Content({
          contentId: i,
          title: `Test Content ${i}`,
          creator: 'test-creator',
          contentType: 'video',
          storage: {
            ipfs: { cid: `QmTest${i}` },
            gaia: { hash: `gaia-test-${i}` }
          },
          isRemoved: false
        });
        promises.push(content.save());
      }

      await Promise.all(promises);

      // Test concurrent cache additions
      const cachePromises = [];
      for (let i = 1; i <= 10; i++) {
        const content = await Content.findOne({ contentId: i });
        cachePromises.push(cdnService.addToCache(content));
      }

      const results = await Promise.all(cachePromises);
      const successfulResults = results.filter(r => r.success);

      expect(successfulResults.length).toBeGreaterThan(0);
    });

    test('should handle analytics aggregation efficiently', async () => {
      // Create multiple analytics entries
      const analyticsPromises = [];
      for (let i = 0; i < 30; i++) {
        const analytics = new CdnAnalytics({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          period: 'daily',
          metrics: {
            totalRequests: Math.floor(Math.random() * 1000) + 100,
            cacheHits: Math.floor(Math.random() * 800) + 50,
            cacheMisses: Math.floor(Math.random() * 200) + 20,
            bytesServed: Math.floor(Math.random() * 1000000) + 100000,
            averageResponseTime: Math.floor(Math.random() * 200) + 50
          }
        });
        analyticsPromises.push(analytics.save());
      }

      await Promise.all(analyticsPromises);

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const startTime = Date.now();
      const result = await cdnService.getAnalytics('daily', startDate, endDate);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});