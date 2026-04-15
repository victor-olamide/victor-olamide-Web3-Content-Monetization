'use strict';

/**
 * Tests for backend/config/database.js and backend/utils/validateEnv.js
 *
 * Uses Jest + mongoose-memory-server (or mocks) so no real MongoDB is needed.
 */

const mongoose = require('mongoose');

// ── validateEnv tests ────────────────────────────────────────────────────────

describe('validateEnv', () => {
  const { validateEnv, REQUIRED_VARS } = require('../utils/validateEnv');

  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, originalEnv);
  });

  it('exports REQUIRED_VARS array containing DB_URI, JWT_SECRET, PORT', () => {
    expect(REQUIRED_VARS).toContain('DB_URI');
    expect(REQUIRED_VARS).toContain('JWT_SECRET');
    expect(REQUIRED_VARS).toContain('PORT');
  });

  it('does not throw when all required vars are set', () => {
    process.env.DB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'supersecret';
    process.env.PORT = '5000';
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws when DB_URI is missing', () => {
    delete process.env.DB_URI;
    process.env.JWT_SECRET = 'supersecret';
    process.env.PORT = '5000';
    expect(() => validateEnv()).toThrow(/DB_URI/);
  });

  it('throws when JWT_SECRET is missing', () => {
    process.env.DB_URI = 'mongodb://localhost:27017/test';
    delete process.env.JWT_SECRET;
    process.env.PORT = '5000';
    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  it('throws when PORT is missing', () => {
    process.env.DB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'supersecret';
    delete process.env.PORT;
    expect(() => validateEnv()).toThrow(/PORT/);
  });

  it('throws listing all missing vars when multiple are absent', () => {
    delete process.env.DB_URI;
    delete process.env.JWT_SECRET;
    delete process.env.PORT;
    expect(() => validateEnv()).toThrow(/DB_URI.*JWT_SECRET.*PORT/s);
  });
});

// ── database.js unit tests (mongoose mocked) ────────────────────────────────

describe('database.js', () => {
  let connectDB, disconnectDB, getConnectionStatus, healthCheck;

  beforeEach(() => {
    jest.resetModules();
    process.env.DB_URI = 'mongodb://localhost:27017/test_db';

    // Mock mongoose.connect and mongoose.connection
    jest.mock('mongoose', () => {
      const actual = jest.requireActual('mongoose');
      return {
        ...actual,
        connect: jest.fn().mockResolvedValue(undefined),
        connection: {
          ...actual.connection,
          readyState: 1,
          host: 'localhost',
          port: 27017,
          name: 'test_db',
          close: jest.fn().mockResolvedValue(undefined),
          on: jest.fn(),
          db: {
            admin: () => ({
              ping: jest.fn().mockResolvedValue({ ok: 1 }),
            }),
          },
        },
      };
    });

    ({ connectDB, disconnectDB, getConnectionStatus, healthCheck } = require('../config/database'));
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('mongoose');
  });

  it('exports connectDB as a function', () => {
    expect(typeof connectDB).toBe('function');
  });

  it('exports disconnectDB as a function', () => {
    expect(typeof disconnectDB).toBe('function');
  });

  it('exports getConnectionStatus as a function', () => {
    expect(typeof getConnectionStatus).toBe('function');
  });

  it('exports healthCheck as a function', () => {
    expect(typeof healthCheck).toBe('function');
  });

  it('getConnectionStatus returns an object with isConnected field', () => {
    const status = getConnectionStatus();
    expect(status).toHaveProperty('isConnected');
    expect(status).toHaveProperty('readyState');
  });

  it('connectDB calls mongoose.connect with DB_URI', async () => {
    const mongoose = require('mongoose');
    await connectDB();
    expect(mongoose.connect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/test_db',
      expect.any(Object)
    );
  });

  it('disconnectDB closes the mongoose connection', async () => {
    const mongoose = require('mongoose');
    await connectDB();
    await disconnectDB();
    expect(mongoose.connection.close).toHaveBeenCalled();
  });

  it('healthCheck returns healthy status when connected', async () => {
    await connectDB();
    const result = await healthCheck();
    expect(result.status).toBe('healthy');
  });

  it('healthCheck returns unhealthy when not connected', async () => {
    // Do not call connectDB — _isConnected stays false
    const result = await healthCheck();
    expect(result.status).toBe('unhealthy');
    expect(result.message).toMatch(/not connected/i);
  });

  it('getConnectionStatus returns expected shape', () => {
    const status = getConnectionStatus();
    expect(status).toMatchObject({
      isConnected: expect.any(Boolean),
      readyState: expect.any(Number),
    });
  });
});

// ── redactUri tests ──────────────────────────────────────────────────────────

describe('redactUri', () => {
  let redactUri;

  beforeEach(() => {
    jest.resetModules();
    process.env.DB_URI = 'mongodb://localhost:27017/test';
    jest.mock('mongoose', () => ({
      connect: jest.fn(),
      connection: { on: jest.fn(), readyState: 0, host: null, port: null, name: null },
    }));
    ({ redactUri } = require('../config/database'));
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('mongoose');
  });

  it('redacts username and password from URI', () => {
    const result = redactUri('mongodb://admin:secret@localhost:27017/db');
    expect(result).not.toContain('secret');
    expect(result).not.toContain('admin');
    expect(result).toContain('***');
  });

  it('returns URI unchanged when no credentials present', () => {
    const result = redactUri('mongodb://localhost:27017/db');
    expect(result).toContain('localhost');
    expect(result).toContain('db');
  });

  it('returns <invalid-uri> for malformed URIs', () => {
    const result = redactUri('not-a-valid-uri');
    expect(result).toBe('<invalid-uri>');
  });
});
