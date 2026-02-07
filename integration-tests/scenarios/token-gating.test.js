const config = require('../config');
const { 
  callContract, 
  readContract, 
  waitForTransaction,
  verifyBackendAccess,
  uintCV, 
  standardPrincipalCV
} = require('../helpers');

describe('Token Gating Integration Test', () => {
  jest.setTimeout(config.timeout);

  const { creator, user1 } = config.testAccounts;
  const contentId = 3;
  const threshold = 100;

  test('Creator sets FT gating rule', async () => {
    const tokenContract = `${config.contractAddress}.mock-token`;
    
    const txId = await callContract(
      'content-gate',
      'set-gating-rule',
      [
        uintCV(contentId),
        standardPrincipalCV(tokenContract),
        uintCV(threshold),
        uintCV(0)
      ],
      creator.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);

    const rule = await readContract(
      'content-gate',
      'get-gating-rule',
      [uintCV(contentId)],
      creator.address
    );

    expect(rule.value).toBeDefined();
    expect(rule.value.threshold.value).toBe(threshold.toString());
  });

  test('User without tokens cannot access', async () => {
    const result = await verifyBackendAccess(user1.address, contentId);
    expect(result.hasAccess).toBe(false);
  });

  test('Creator can delete gating rule', async () => {
    const txId = await callContract(
      'content-gate',
      'delete-gating-rule',
      [uintCV(contentId)],
      creator.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);

    const rule = await readContract(
      'content-gate',
      'get-gating-rule',
      [uintCV(contentId)],
      creator.address
    );

    expect(rule.value).toBeNull();
  });

  test('Creator sets NFT gating rule', async () => {
    const nftContract = `${config.contractAddress}.mock-nft`;
    
    const txId = await callContract(
      'content-gate',
      'set-gating-rule',
      [
        uintCV(contentId),
        standardPrincipalCV(nftContract),
        uintCV(1),
        uintCV(1)
      ],
      creator.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);

    const gatingType = await readContract(
      'content-gate',
      'get-gating-type',
      [uintCV(contentId)],
      creator.address
    );

    expect(gatingType.value.value).toBe('1');
  });
});
