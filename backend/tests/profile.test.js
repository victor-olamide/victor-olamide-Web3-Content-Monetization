'use strict';

/**
 * Tests for profile CRUD endpoints (issue #149)
 *   GET  /api/profile/:id
 *   PUT  /api/profile/:id
 *
 * Uses Jest + supertest. MongoDB is mocked via jest.mock.
 */

const request = require('supertest');

// ── validateProfileId ─────────────────────────────────────────────────────────
describe('validateProfileId middleware', () => {
  const { validateProfileId } = require('../middleware/profileValidation');

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('calls next() when id is a valid non-empty string', () => {
    const req = { params: { id: 'SP1ABC' } };
    const res = mockRes();
    const next = jest.fn();
    validateProfileId(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.params.id).toBe('sp1abc');
  });

  it('returns 400 when id is missing', () => {
    const req = { params: {} };
    const res = mockRes();
    validateProfileId(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns 400 when id is empty string', () => {
    const req = { params: { id: '   ' } };
    const res = mockRes();
    validateProfileId(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('lowercases the id param', () => {
    const req = { params: { id: 'SP1UPPER' } };
    const res = mockRes();
    const next = jest.fn();
    validateProfileId(req, res, next);
    expect(req.params.id).toBe('sp1upper');
  });
});

// ── validateProfileUpdate ─────────────────────────────────────────────────────
describe('validateProfileUpdate middleware', () => {
  const { validateProfileUpdate } = require('../middleware/profileValidation');

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('calls next() with valid displayName', () => {
    const req = { body: { displayName: 'Alice' } };
    const next = jest.fn();
    validateProfileUpdate(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() with valid bio', () => {
    const req = { body: { bio: 'Hello world' } };
    const next = jest.fn();
    validateProfileUpdate(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() with valid avatar URL', () => {
    const req = { body: { avatar: 'https://example.com/avatar.png' } };
    const next = jest.fn();
    validateProfileUpdate(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when body is empty', () => {
    const req = { body: {} };
    const res = mockRes();
    validateProfileUpdate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when displayName exceeds 100 chars', () => {
    const req = { body: { displayName: 'a'.repeat(101) } };
    const res = mockRes();
    validateProfileUpdate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
  });

  it('returns 400 when bio exceeds 500 chars', () => {
    const req = { body: { bio: 'b'.repeat(501) } };
    const res = mockRes();
    validateProfileUpdate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when avatar is not a valid URL', () => {
    const req = { body: { avatar: 'not-a-url' } };
    const res = mockRes();
    validateProfileUpdate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows avatar to be empty string (clear avatar)', () => {
    const req = { body: { avatar: '' } };
    const next = jest.fn();
    validateProfileUpdate(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

// ── userProfileService ────────────────────────────────────────────────────────
describe('userProfileService.getProfileById', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../models/UserProfile', () => ({
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
    }));
    jest.mock('../models/PurchaseHistory', () => ({}));
    jest.mock('../models/Purchase', () => ({}));
    jest.mock('../models/Content', () => ({}));
    service = require('../services/userProfileService');
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('../models/UserProfile');
    jest.unmock('../models/PurchaseHistory');
    jest.unmock('../models/Purchase');
    jest.unmock('../models/Content');
  });

  it('returns profile when found', async () => {
    const UserProfile = require('../models/UserProfile');
    const mockProfile = { address: 'sp1abc', displayName: 'Alice' };
    UserProfile.findOne.mockResolvedValue(mockProfile);
    const result = await service.getProfileById('SP1ABC');
    expect(result).toEqual(mockProfile);
    expect(UserProfile.findOne).toHaveBeenCalledWith({ address: 'sp1abc' });
  });

  it('throws 404 error when profile not found', async () => {
    const UserProfile = require('../models/UserProfile');
    UserProfile.findOne.mockResolvedValue(null);
    await expect(service.getProfileById('SP1NOTFOUND')).rejects.toMatchObject({
      message: 'Profile not found',
      statusCode: 404,
    });
  });
});

describe('userProfileService.updateProfileById', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../models/UserProfile', () => ({
      findOneAndUpdate: jest.fn(),
    }));
    jest.mock('../models/PurchaseHistory', () => ({}));
    jest.mock('../models/Purchase', () => ({}));
    jest.mock('../models/Content', () => ({}));
    service = require('../services/userProfileService');
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('../models/UserProfile');
    jest.unmock('../models/PurchaseHistory');
    jest.unmock('../models/Purchase');
    jest.unmock('../models/Content');
  });

  it('updates and returns profile with allowed fields', async () => {
    const UserProfile = require('../models/UserProfile');
    const updated = { address: 'sp1abc', displayName: 'Bob', bio: 'Hi', avatar: 'https://x.com/a.png' };
    UserProfile.findOneAndUpdate.mockResolvedValue(updated);
    const result = await service.updateProfileById('SP1ABC', { displayName: 'Bob', bio: 'Hi', avatar: 'https://x.com/a.png' });
    expect(result).toEqual(updated);
    expect(UserProfile.findOneAndUpdate).toHaveBeenCalledWith(
      { address: 'sp1abc' },
      expect.objectContaining({ $set: expect.objectContaining({ displayName: 'Bob', bio: 'Hi' }) }),
      expect.any(Object)
    );
  });

  it('throws 404 when profile not found', async () => {
    const UserProfile = require('../models/UserProfile');
    UserProfile.findOneAndUpdate.mockResolvedValue(null);
    await expect(service.updateProfileById('SP1NOTFOUND', { displayName: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 400 when no updatable fields provided', async () => {
    await expect(service.updateProfileById('SP1ABC', { unknownField: 'x' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('does not write non-allowed fields', async () => {
    const UserProfile = require('../models/UserProfile');
    UserProfile.findOneAndUpdate.mockResolvedValue({ address: 'sp1abc' });
    await service.updateProfileById('SP1ABC', { displayName: 'Alice', status: 'deleted' });
    const callArg = UserProfile.findOneAndUpdate.mock.calls[0][1].$set;
    expect(callArg).not.toHaveProperty('status');
    expect(callArg).toHaveProperty('displayName', 'Alice');
  });
});
