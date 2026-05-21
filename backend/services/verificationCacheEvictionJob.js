const { evictExpiredCache, getCacheStats } = require('./blockchainVerification');

const EVICTION_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

let evictionTimer = null;

function startCacheEvictionJob() {
  if (evictionTimer) return;
  evictionTimer = setInterval(() => {
    const before = getCacheStats().size;
    evictExpiredCache();
    const after = getCacheStats().size;
    if (before !== after) {
      console.info(`[CacheEviction] Evicted ${before - after} expired verification entries`);
    }
  }, EVICTION_INTERVAL_MS);
  console.info('[CacheEviction] Verification cache eviction job started');
}

function stopCacheEvictionJob() {
  if (evictionTimer) {
    clearInterval(evictionTimer);
    evictionTimer = null;
    console.info('[CacheEviction] Verification cache eviction job stopped');
  }
}

module.exports = { startCacheEvictionJob, stopCacheEvictionJob };
