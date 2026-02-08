const { markExpiredLicenses } = require('./licensingService');

let licenseCleanupScheduler = null;

/**
 * Initialize scheduler to periodically clean up expired licenses
 * @param {number} intervalMs - Interval in milliseconds
 */
const initializeLicenseCleanup = (intervalMs = 3600000) => {
  try {
    licenseCleanupScheduler = setInterval(async () => {
      try {
        const result = await markExpiredLicenses();
        console.log(`[License Cleanup] Marked ${result.modifiedCount} licenses as expired`);
      } catch (err) {
        console.error('[License Cleanup Error]', err.message);
      }
    }, intervalMs);

    console.log(`[License Cleanup] Scheduler initialized with interval: ${intervalMs}ms`);
  } catch (err) {
    console.error('Failed to initialize license cleanup scheduler:', err);
  }
};

/**
 * Stop the license cleanup scheduler
 */
const stopLicenseCleanup = () => {
  if (licenseCleanupScheduler) {
    clearInterval(licenseCleanupScheduler);
    licenseCleanupScheduler = null;
    console.log('[License Cleanup] Scheduler stopped');
  }
};

/**
 * Trigger immediate cleanup (for testing or manual execution)
 */
const triggerLicenseCleanup = async () => {
  try {
    const result = await markExpiredLicenses();
    console.log(`[License Cleanup] Immediate cleanup: marked ${result.modifiedCount} licenses as expired`);
    return result;
  } catch (err) {
    console.error('[License Cleanup Error]', err);
    throw err;
  }
};

/**
 * Get cleanup scheduler stats
 */
const getCleanupStats = () => {
  return {
    running: licenseCleanupScheduler !== null,
    lastRun: new Date().toISOString()
  };
};

module.exports = {
  initializeLicenseCleanup,
  stopLicenseCleanup,
  triggerLicenseCleanup,
  getCleanupStats
};
