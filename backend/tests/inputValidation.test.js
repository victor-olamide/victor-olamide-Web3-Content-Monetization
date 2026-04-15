'use strict';

const {
  validatePurchaseBody,
  validateContentBody,
  validateAmountParam,
  validateAddressParam,
  isValidStxAddress,
  isValidTxId,
  isPositiveNumber,
  isNonEmptyString,
} = require('../middleware/inputValidation');

// ─── Helper to build lightweight req/res/next mocks ──────────────────────────

const makeReq = ({ body = {}, params = {} } = {}) => ({ body, params });

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

beforeEach(() => {
  next.mockClear();
});

// ─── isValidStxAddress ────────────────────────────────────────────────────────

describe('isValidStxAddress', () => {
  test('accepts a valid SP mainnet address', () => {
    expect(isValidStxAddress('SP3X6QWWETNBZWGBK6DRGXALKBQH7SSCGCJH3JMBM')).toBe(true);
  });

  test('accepts a valid ST testnet address', () => {
    expect(isValidStxAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')).toBe(true);
  });

  test('rejects an Ethereum-style address', () => {
    expect(isValidStxAddress('0xAbCd1234567890abcdef1234567890abcdef1234')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isValidStxAddress('')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(isValidStxAddress(null)).toBe(false);
    expect(isValidStxAddress(42)).toBe(false);
  });
});

// ─── isValidTxId ─────────────────────────────────────────────────────────────

describe('isValidTxId', () => {
  const valid64 = 'a'.repeat(64);

  test('accepts a 64-char hex string without prefix', () => {
    expect(isValidTxId(valid64)).toBe(true);
  });

  test('accepts a 64-char hex string with 0x prefix', () => {
    expect(isValidTxId('0x' + valid64)).toBe(true);
  });

  test('rejects a string shorter than 64 hex chars', () => {
    expect(isValidTxId('abc123')).toBe(false);
  });

  test('rejects non-hex characters', () => {
    expect(isValidTxId('z'.repeat(64))).toBe(false);
  });
});

// ─── isPositiveNumber ─────────────────────────────────────────────────────────

describe('isPositiveNumber', () => {
  test('returns true for a positive finite number', () => {
    expect(isPositiveNumber(10)).toBe(true);
    expect(isPositiveNumber(0.001)).toBe(true);
  });

  test('returns false for zero', () => {
    expect(isPositiveNumber(0)).toBe(false);
  });

  test('returns false for negative numbers', () => {
    expect(isPositiveNumber(-5)).toBe(false);
  });

  test('returns false for Infinity', () => {
    expect(isPositiveNumber(Infinity)).toBe(false);
  });

  test('returns false for non-numbers', () => {
    expect(isPositiveNumber('10')).toBe(false);
  });
});

// ─── isNonEmptyString ─────────────────────────────────────────────────────────

describe('isNonEmptyString', () => {
  test('returns true for a non-empty string', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  test('returns false for an empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  test('returns false for whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  test('returns false for non-string values', () => {
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });
});

// ─── validateAmountParam ─────────────────────────────────────────────────────

describe('validateAmountParam', () => {
  test('calls next() and sets req.parsedAmount for a valid positive integer', () => {
    const req = makeReq({ params: { amount: '5' } });
    const res = makeRes();
    validateAmountParam(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.parsedAmount).toBe(5);
  });

  test('returns 400 for a non-integer string', () => {
    const req = makeReq({ params: { amount: 'abc' } });
    const res = makeRes();
    validateAmountParam(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 for zero', () => {
    const req = makeReq({ params: { amount: '0' } });
    const res = makeRes();
    validateAmountParam(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 for a negative integer', () => {
    const req = makeReq({ params: { amount: '-3' } });
    const res = makeRes();
    validateAmountParam(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── validateAddressParam ─────────────────────────────────────────────────────

describe('validateAddressParam', () => {
  test('calls next() for a valid SP address', () => {
    const req = makeReq({ params: { address: 'SP3X6QWWETNBZWGBK6DRGXALKBQH7SSCGCJH3JMBM' } });
    const res = makeRes();
    validateAddressParam(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 400 for an invalid address', () => {
    const req = makeReq({ params: { address: 'not-an-address' } });
    const res = makeRes();
    validateAddressParam(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('falls back to req.params.user when req.params.address is absent', () => {
    const req = makeReq({ params: { user: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' } });
    const res = makeRes();
    validateAddressParam(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── validatePurchaseBody ─────────────────────────────────────────────────────

const VALID_PURCHASE = {
  contentId: 1,
  user: 'SP3X6QWWETNBZWGBK6DRGXALKBQH7SSCGCJH3JMBM',
  txId: 'a'.repeat(64),
  amount: 10,
  creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
};

describe('validatePurchaseBody', () => {
  test('calls next() for a fully valid body', () => {
    const req = makeReq({ body: { ...VALID_PURCHASE } });
    const res = makeRes();
    validatePurchaseBody(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.validatedBody.contentId).toBe(1);
  });

  test('returns 400 when contentId is missing', () => {
    const { contentId, ...rest } = VALID_PURCHASE;
    const req = makeReq({ body: rest });
    const res = makeRes();
    validatePurchaseBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 for an invalid user address', () => {
    const req = makeReq({ body: { ...VALID_PURCHASE, user: 'invalid' } });
    const res = makeRes();
    validatePurchaseBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 for a negative amount', () => {
    const req = makeReq({ body: { ...VALID_PURCHASE, amount: -5 } });
    const res = makeRes();
    validatePurchaseBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 for an invalid txId', () => {
    const req = makeReq({ body: { ...VALID_PURCHASE, txId: 'short' } });
    const res = makeRes();
    validatePurchaseBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('accepts a numeric string amount and coerces it', () => {
    const req = makeReq({ body: { ...VALID_PURCHASE, amount: '5.5' } });
    const res = makeRes();
    validatePurchaseBody(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.validatedBody.amount).toBe(5.5);
  });
});

// ─── validateContentBody ─────────────────────────────────────────────────────

const VALID_CONTENT = {
  contentId: 2,
  title: 'My Video',
  contentType: 'video',
  price: 5,
  creator: 'SP3X6QWWETNBZWGBK6DRGXALKBQH7SSCGCJH3JMBM',
};

describe('validateContentBody', () => {
  test('calls next() for a valid content body', () => {
    const req = makeReq({ body: { ...VALID_CONTENT } });
    const res = makeRes();
    validateContentBody(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 400 for an unsupported contentType', () => {
    const req = makeReq({ body: { ...VALID_CONTENT, contentType: 'podcast' } });
    const res = makeRes();
    validateContentBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when price is negative', () => {
    const req = makeReq({ body: { ...VALID_CONTENT, price: -1 } });
    const res = makeRes();
    validateContentBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('accepts price of zero (free content)', () => {
    const req = makeReq({ body: { ...VALID_CONTENT, price: 0 } });
    const res = makeRes();
    validateContentBody(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 400 when title exceeds 200 characters', () => {
    const req = makeReq({ body: { ...VALID_CONTENT, title: 'x'.repeat(201) } });
    const res = makeRes();
    validateContentBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when description exceeds 2000 characters', () => {
    const req = makeReq({ body: { ...VALID_CONTENT, description: 'd'.repeat(2001) } });
    const res = makeRes();
    validateContentBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 for an invalid creator address', () => {
    const req = makeReq({ body: { ...VALID_CONTENT, creator: 'bad-address' } });
    const res = makeRes();
    validateContentBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
