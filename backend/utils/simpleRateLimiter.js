const clients = new Map();

// Simple in-memory rate limiter: max `max` requests per `windowMs` per key
function rateLimiter({ windowMs = 60000, max = 60, key = (req) => req.ip } = {}) {
  return (req, res, next) => {
    try {
      const k = key(req);
      const now = Date.now();
      const entry = clients.get(k) || { count: 0, start: now };
      if (now - entry.start > windowMs) {
        entry.count = 1;
        entry.start = now;
      } else {
        entry.count += 1;
      }
      clients.set(k, entry);
      if (entry.count > max) {
        return res.status(429).json({ error: 'rate_limit_exceeded' });
      }
      next();
    } catch (err) {
      next();
    }
  };
}

module.exports = { rateLimiter };
