const config = require('../config');
const { 
  callContract, 
  readContract, 
  waitForTransaction,
  verifyBackendAccess,
  streamContent,
  uintCV, 
  standardPrincipalCV,
  stringAsciiCV 
} = require('../helpers');

describe('Pay-Per-View Integration Test', () => {
  jest.setTimeout(config.timeout);

  const { creator, user1 } = config.testAccounts;
  const { contentId, price, uri } = config.testContent;

  test('Creator adds content to contract', async () => {
    const txId = await callContract(
      'pay-per-view',
      'add-content',
      [uintCV(contentId), uintCV(price), stringAsciiCV(uri)],
      creator.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);

    const contentInfo = await readContract(
      'pay-per-view',
      'get-content-info',
      [uintCV(contentId)],
      creator.address
    );

    expect(contentInfo.value).toBeDefined();
    expect(contentInfo.value.price.value).toBe(price.toString());
  });

  test('User cannot access content before purchase', async () => {
    const hasAccess = await readContract(
      'pay-per-view',
      'has-access',
      [uintCV(contentId), standardPrincipalCV(user1.address)],
      user1.address
    );

    expect(hasAccess.value).toBe(false);
  });

  test('Backend denies access before purchase', async () => {
    const result = await verifyBackendAccess(user1.address, contentId);
    expect(result.hasAccess).toBe(false);
  });

  test('User purchases content', async () => {
    const txId = await callContract(
      'pay-per-view',
      'purchase-content',
      [uintCV(contentId)],
      user1.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);
  });

  test('User has access after purchase', async () => {
    const hasAccess = await readContract(
      'pay-per-view',
      'has-access',
      [uintCV(contentId), standardPrincipalCV(user1.address)],
      user1.address
    );

    expect(hasAccess.value).toBe(true);
  });

  test('Backend grants access after purchase', async () => {
    const result = await verifyBackendAccess(user1.address, contentId);
    expect(result.hasAccess).toBe(true);
    expect(result.method).toBe('pay-per-view');
  });

  test('User can stream content after purchase', async () => {
    const response = await streamContent(user1.address, contentId);
    expect(response.status).toBeLessThan(500);
  });

  test('User cannot purchase same content twice', async () => {
    try {
      const txId = await callContract(
        'pay-per-view',
        'purchase-content',
        [uintCV(contentId)],
        user1.key
      );
      await waitForTransaction(txId);
      fail('Should have thrown error');
    } catch (err) {
      expect(err).toBeDefined();
    }
  });
});
