const encryptionService = require('../services/encryptionService');

describe('Encryption Service', () => {
  test('encryptBuffer and decryptBuffer should round-trip correctly', () => {
    const plaintext = Buffer.from('Premium content secret payload');
    const key = encryptionService.generateEncryptionKey();

    const encrypted = encryptionService.encryptBuffer(plaintext, key);
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');

    const decrypted = encryptionService.decryptBuffer(
      encrypted.encryptedData,
      encrypted.iv,
      encrypted.authTag,
      key
    );

    expect(decrypted.toString('utf8')).toBe(plaintext.toString('utf8'));
  });

  test('wrapContentKey and unwrapContentKey should recover the original key', () => {
    const contentKey = encryptionService.generateEncryptionKey();
    const masterKey = encryptionService.generateEncryptionKey();

    const wrapped = encryptionService.wrapContentKey(contentKey, masterKey);
    expect(wrapped).toHaveProperty('encryptedKey');
    expect(wrapped).toHaveProperty('iv');
    expect(wrapped).toHaveProperty('authTag');

    const unwrapped = encryptionService.unwrapContentKey(
      wrapped.encryptedKey,
      wrapped.iv,
      wrapped.authTag,
      masterKey
    );

    expect(unwrapped.toString('hex')).toBe(contentKey.toString('hex'));
  });
});
