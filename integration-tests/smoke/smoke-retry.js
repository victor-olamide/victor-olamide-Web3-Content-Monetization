'use strict';

/**
 * Retry utility for deployment smoke tests (#195).
 * Wraps async functions with exponential back-off retries so
 * transient network hiccups do not cause false deployment blocks.
 */

/**
 * @param {Function} fn        - Async function to retry
 * @param {number}   retries   - Max attempts (default 3)
 * @param {number}   delayMs   - Initial delay in ms (doubles each attempt)
 * @returns {Promise<*>}
 */
async function withRetry(fn, retries = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const wait = delayMs * Math.pow(2, attempt - 1);
        console.log(`    ↻ Retry ${attempt}/${retries - 1} after ${wait}ms — ${err.message}`);
        await sleep(wait);
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { withRetry, sleep };
