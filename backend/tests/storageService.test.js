const { getGatewayUrl } = require('../services/storageService');

describe('Storage Service', () => {
  test('getGatewayUrl should correctly format IPFS URLs', () => {
    const ipfsUrl = 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const expected = 'https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    expect(getGatewayUrl(ipfsUrl)).toBe(expected);
  });

  test('getGatewayUrl should return empty string for null/undefined', () => {
    expect(getGatewayUrl(null)).toBe('');
    expect(getGatewayUrl(undefined)).toBe('');
  });
});
