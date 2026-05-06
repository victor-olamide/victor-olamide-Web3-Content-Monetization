/**
 * Analytics Middleware
 * Automatically tracks page views and user interactions
 */

const analyticsService = require('../services/analyticsService');

/**
 * Track page views automatically
 */
const trackPageView = (req, res, next) => {
  // Only track GET requests for pages (not API calls)
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    const eventData = {
      eventType: 'PAGE_VIEW',
      userId: req.user?.id,
      sessionId: req.sessionID,
      url: req.originalUrl,
      referrer: req.headers.referer,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    // Add geographic data if available
    if (req.geo) {
      eventData.country = req.geo.country;
      eventData.city = req.geo.city;
    }

    // Fire and forget - don't block the response
    analyticsService.trackEvent(eventData).catch(error => {
      console.error('Error tracking page view:', error);
    });
  }

  next();
};

/**
 * Track API usage
 */
const trackApiUsage = (req, res, next) => {
  const startTime = Date.now();

  // Track the response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const eventData = {
      eventType: 'API_CALL',
      userId: req.user?.id,
      sessionId: req.sessionID,
      url: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: duration,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    // Add metadata about the API call
    eventData.metadata = {
      endpoint: req.path,
      query: req.query,
      hasAuth: !!req.user,
      userRole: req.user?.role,
    };

    // Fire and forget
    analyticsService.trackEvent(eventData).catch(error => {
      console.error('Error tracking API usage:', error);
    });
  });

  next();
};

/**
 * Track user authentication events
 */
const trackAuthEvents = (req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    // Track successful login
    if (req.path === '/api/auth/login' && res.statusCode === 200) {
      const eventData = {
        eventType: 'USER_LOGIN',
        userId: req.user?.id,
        sessionId: req.sessionID,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      };

      analyticsService.trackEvent(eventData).catch(error => {
        console.error('Error tracking login event:', error);
      });
    }

    // Track successful registration
    if (req.path === '/api/auth/register' && res.statusCode === 201) {
      const eventData = {
        eventType: 'USER_REGISTRATION',
        userId: req.user?.id,
        sessionId: req.sessionID,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      };

      analyticsService.trackEvent(eventData).catch(error => {
        console.error('Error tracking registration event:', error);
      });
    }

    originalSend.call(this, data);
  };

  next();
};

/**
 * Track content interactions
 */
const trackContentInteractions = (req, res, next) => {
  // Track content views
  if (req.path.match(/^\/api\/content\/[^\/]+$/)) {
    const originalSend = res.send;

    res.send = function(data) {
      if (res.statusCode === 200) {
        const contentId = req.path.split('/').pop();

        const eventData = {
          eventType: 'CONTENT_VIEW',
          userId: req.user?.id,
          sessionId: req.sessionID,
          contentId,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        };

        analyticsService.trackEvent(eventData).catch(error => {
          console.error('Error tracking content view:', error);
        });
      }

      originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Track transaction events
 */
const trackTransactionEvents = (req, res, next) => {
  if (req.path.includes('/api/transactions') || req.path.includes('/api/payments')) {
    const originalSend = res.send;

    res.send = function(data) {
      if (res.statusCode === 200 || res.statusCode === 201) {
        const eventData = {
          eventType: 'TRANSACTION',
          userId: req.user?.id,
          sessionId: req.sessionID,
          metadata: {
            amount: req.body?.amount,
            type: req.body?.type,
            method: req.body?.paymentMethod,
          },
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        };

        analyticsService.trackEvent(eventData).catch(error => {
          console.error('Error tracking transaction:', error);
        });
      }

      originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Add geographic information to requests
 * (This would typically use a geo-IP service)
 */
const addGeoData = (req, res, next) => {
  // In a real implementation, this would use a service like MaxMind GeoIP
  // For now, we'll add mock geo data
  const mockGeoData = {
    country: ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'AU'][Math.floor(Math.random() * 7)],
    city: ['New York', 'London', 'Toronto', 'Berlin', 'Paris', 'Tokyo', 'Sydney'][Math.floor(Math.random() * 7)],
    region: 'NY',
    timezone: 'America/New_York',
  };

  req.geo = mockGeoData;
  next();
};

/**
 * Track search events
 */
const trackSearchEvents = (req, res, next) => {
  if (req.path.includes('/api/search') || req.query.q) {
    const eventData = {
      eventType: 'SEARCH',
      userId: req.user?.id,
      sessionId: req.sessionID,
      metadata: {
        query: req.query.q,
        filters: req.query,
        resultsCount: 0, // This would be set by the search controller
      },
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    analyticsService.trackEvent(eventData).catch(error => {
      console.error('Error tracking search event:', error);
    });
  }

  next();
};

module.exports = {
  trackPageView,
  trackApiUsage,
  trackAuthEvents,
  trackContentInteractions,
  trackTransactionEvents,
  addGeoData,
  trackSearchEvents,
};
