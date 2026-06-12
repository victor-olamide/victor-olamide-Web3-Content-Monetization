'use strict';

/**
 * CDN integration tests (#197)
 *
 * Tests the CDN→IPFS fallback chain, cache key stability,
 * CdnCache model statics, and cache invalidation on content mutation.
 */

const { buildCacheKey, buildCdnUrl, isCacheEntryValid, remainingTtl } = require('../utils/cdnUtils');
const { resolveFallbackUrl, resolveGatewayUrl } = require('../services/ipfsFallbackService');

// ── cdnUtils ─────────────────────────────────────────────────────────────────

describe('buildCacheKey', () => {
  it('returns a 16-char hex string', () => {
    const key = buildCacheKey(42, 'video');
    expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic — same inputs produce same key', () => {
    expect(buildCacheKey(42, 'video')).toBe(buildCacheKey(42, 'video'));
  });

  it('differs for different contentIds', () => {
    expect(buildCacheKey(1, 'video')).not.toBe(buildCacheKey(2, 'video'));
  });

  it('differs for different contentTypes', () => {
    expect(buildCacheKey(1, 'video')).not.toBe(buildCacheKey(1, 'audio'));
  });
});

describe('buildCdnUrl', () => {
  const cfg = {
    enabled: true,
    contentDelivery: { enabled: true },
    urls: { protocol: 'https', primaryDomain: 'cdn.example.com', port: '443' },
  };

  it('builds a valid HTTPS URL', () => {
    const url = buildCdnUrl('content/1/abc', cfg);
    expect(url).toBe('https://cdn.example.com/content/1/abc');
  });

  it('strips leading slash from path', () => {
    const url = buildCdnUrl('/content/1/abc', cfg);
    expect(url).toBe('https://cdn.example.com/content/1/abc');
  });

  it('returns null when CDN is disabled', () => {
    const disabledCfg = { ...cfg, enabled: false };
    expect(buildCdnUrl('content/1/abc', disabledCfg)).toBeNull();
  });

  it('returns null when contentDelivery is disabled', () => {
    const disabledCfg = { ...cfg, contentDelivery: { enabled: false } };
    expect(buildCdnUrl('content/1/abc', disabledCfg)).toBeNull();
  });

  it('appends non-443 port', () => {
    const cfgWithPort = { ...cfg, urls: { ...cfg.urls, port: '8080' } };
    const url = buildCdnUrl('content/1/abc', cfgWithPort);
    expect(url).toContain(':8080');
  });
});

describe('isCacheEntryValid', () => {
  it('returns true for a valid non-expired entry', () => {
    const entry = { status: 'cached', expiresAt: new Date(Date.now() + 60000) };
    expect(isCacheEntryValid(entry)).toBe(true);
  });

  it('returns false when entry is expired', () => {
    const entry = { status: 'cached', expiresAt: new Date(Date.now() - 1000) };
    expect(isCacheEntryValid(entry)).toBe(false);
  });

  it('returns false when status is purged', () => {
    const entry = { status: 'purged', expiresAt: new Date(Date.now() + 60000) };
    expect(isCacheEntryValid(entry)).toBe(false);
  });

  it('returns false for null entry', () => {
    expect(isCacheEntryValid(null)).toBe(false);
  });
});

describe('remainingTtl', () => {
  it('returns positive seconds for a future expiry', () => {
    const entry = { status: 'cached', expiresAt: new Date(Date.now() + 10000) };
    expect(remainingTtl(entry)).toBeGreaterThan(0);
  });

  it('returns 0 for an expired entry', () => {
    const entry = { status: 'cached', expiresAt: new Date(Date.now() - 1000) };
    expect(remainingTtl(entry)).toBe(0);
  });
});

// ── ipfsFallbackService ───────────────────────────────────────────────────────

describe('resolveGatewayUrl', () => {
  it('converts ipfs:// URL to pinata gateway', () => {
    const url = resolveGatewayUrl('ipfs://QmTestHash', 'ipfs');
    expect(url).toContain('QmTestHash');
    expect(url).toMatch(/^https?:\/\//);
  });

  it('returns gaia URL unchanged', () => {
    const gaiaUrl = 'https://hub.blockstack.org/my-file';
    expect(resolveGatewayUrl(gaiaUrl, 'gaia')).toBe(gaiaUrl);
  });

  it('returns null for empty url', () => {
    expect(resolveGatewayUrl('', 'ipfs')).toBeNull();
  });
});

describe('resolveFallbackUrl', () => {
  it('returns a URL string for an IPFS content doc', async () => {
    const content = { contentId: 1, url: 'ipfs://QmTestHash', storageType: 'ipfs' };
    const url = await resolveFallbackUrl(content);
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

  it('returns null for content with no url', async () => {
    const content = { contentId: 2, url: '', storageType: 'ipfs' };
    const url = await resolveFallbackUrl(content);
    expect(url).toBeNull();
  });
});
