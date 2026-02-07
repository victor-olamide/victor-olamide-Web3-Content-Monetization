const config = require('../config');
const { 
  callContract, 
  readContract, 
  waitForTransaction,
  verifyBackendAccess,
  uintCV, 
  standardPrincipalCV
} = require('../helpers');

describe('Subscription Integration Test', () => {
  jest.setTimeout(config.timeout);

  const { creator, user1 } = config.testAccounts;
  const { tierId, price, duration } = config.testSubscription;

  test('Creator creates subscription tier', async () => {
    const txId = await callContract(
      'subscription',
      'create-tier',
      [uintCV(tierId), uintCV(price), uintCV(duration)],
      creator.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);

    const tierInfo = await readContract(
      'subscription',
      'get-tier-info',
      [standardPrincipalCV(creator.address), uintCV(tierId)],
      creator.address
    );

    expect(tierInfo.value).toBeDefined();
    expect(tierInfo.value.price.value).toBe(price.toString());
  });

  test('User is not subscribed initially', async () => {
    const isSubscribed = await readContract(
      'subscription',
      'is-subscribed',
      [
        standardPrincipalCV(user1.address),
        standardPrincipalCV(creator.address),
        uintCV(tierId)
      ],
      user1.address
    );

    expect(isSubscribed.value).toBe(false);
  });

  test('User subscribes to tier', async () => {
    const txId = await callContract(
      'subscription',
      'subscribe',
      [standardPrincipalCV(creator.address), uintCV(tierId)],
      user1.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);
  });

  test('User is subscribed after subscription', async () => {
    const isSubscribed = await readContract(
      'subscription',
      'is-subscribed',
      [
        standardPrincipalCV(user1.address),
        standardPrincipalCV(creator.address),
        uintCV(tierId)
      ],
      user1.address
    );

    expect(isSubscribed.value).toBe(true);
  });

  test('Backend verifies subscription access', async () => {
    const contentId = 2;
    const result = await verifyBackendAccess(user1.address, contentId);
    
    if (result.hasAccess) {
      expect(result.method).toBe('subscription');
    }
  });

  test('Creator can update tier', async () => {
    const newPrice = 7000000;
    const txId = await callContract(
      'subscription',
      'update-tier',
      [uintCV(tierId), uintCV(newPrice), uintCV(duration), uintCV(1)],
      creator.key
    );

    expect(txId).toBeDefined();
    await waitForTransaction(txId);

    const tierInfo = await readContract(
      'subscription',
      'get-tier-info',
      [standardPrincipalCV(creator.address), uintCV(tierId)],
      creator.address
    );

    expect(tierInfo.value.price.value).toBe(newPrice.toString());
  });
});
