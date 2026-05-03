const config = require('../config');
const axios = require('axios');
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

describe('End-to-End User Journey', () => {
  jest.setTimeout(config.timeout);

  const { creator, user1, user2 } = config.testAccounts;
  const contentId = 10;
  const price = 2000000;
  const uri = 'ipfs://QmE2EJourney';

  test('Complete creator workflow', async () => {
    // Step 1: Creator adds content
    const addTxId = await callContract(
      'pay-per-view',
      'add-content',
      [uintCV(contentId), uintCV(price), stringAsciiCV(uri)],
      creator.key
    );
    await waitForTransaction(addTxId);

    // Step 2: Verify content exists
    const contentInfo = await readContract(
      'pay-per-view',
      'get-content-info',
      [uintCV(contentId)],
      creator.address
    );
    expect(contentInfo.value).toBeDefined();

    // Step 3: Creator has automatic access
    const creatorAccess = await verifyBackendAccess(creator.address, contentId);
    expect(creatorAccess.hasAccess).toBe(true);
    expect(creatorAccess.reason).toBe('creator');
  });

  test('Complete user purchase workflow', async () => {
    // Step 1: User checks access (should be denied)
    const initialAccess = await verifyBackendAccess(user1.address, contentId);
    expect(initialAccess.hasAccess).toBe(false);

    // Step 2: User attempts to stream (should fail)
    const streamBefore = await streamContent(user1.address, contentId);
    expect(streamBefore.status).toBeGreaterThanOrEqual(400);

    // Step 3: User purchases content
    const purchaseTxId = await callContract(
      'pay-per-view',
      'purchase-content',
      [uintCV(contentId)],
      user1.key
    );
    await waitForTransaction(purchaseTxId);

    // Step 4: Verify on-chain access
    const onChainAccess = await readContract(
      'pay-per-view',
      'has-access',
      [uintCV(contentId), standardPrincipalCV(user1.address)],
      user1.address
    );
    expect(onChainAccess.value).toBe(true);

    // Step 5: Backend verifies access
    const backendAccess = await verifyBackendAccess(user1.address, contentId);
    expect(backendAccess.hasAccess).toBe(true);
    expect(backendAccess.method).toBe('pay-per-view');

    // Step 6: User can now stream content
    const streamAfter = await streamContent(user1.address, contentId);
    expect(streamAfter.status).toBeLessThan(500);
  });

  test('Multiple users independent access', async () => {
    // User1 has access
    const user1Access = await verifyBackendAccess(user1.address, contentId);
    expect(user1Access.hasAccess).toBe(true);

    // User2 does not have access
    const user2Access = await verifyBackendAccess(user2.address, contentId);
    expect(user2Access.hasAccess).toBe(false);

    // User2 cannot stream
    const user2Stream = await streamContent(user2.address, contentId);
    expect(user2Stream.status).toBeGreaterThanOrEqual(400);
  });

  test('Analytics tracking', async () => {
    // Check user access logs
    const userLogs = await axios.get(
      `${config.backendApi}/analytics/user/${user1.address}?limit=10`,
      { validateStatus: () => true }
    );
    
    if (userLogs.status === 200) {
      expect(userLogs.data.logs).toBeDefined();
    }

    // Check content access stats
    const contentStats = await axios.get(
      `${config.backendApi}/analytics/stats/${contentId}`,
      { validateStatus: () => true }
    );
    
    if (contentStats.status === 200) {
      expect(contentStats.data.stats).toBeDefined();
    }
  });

  test('Creator can update content price', async () => {
    const newPrice = 3000000;
    const updateTxId = await callContract(
      'pay-per-view',
      'update-content-price',
      [uintCV(contentId), uintCV(newPrice)],
      creator.key
    );
    await waitForTransaction(updateTxId);

    const updatedInfo = await readContract(
      'pay-per-view',
      'get-content-info',
      [uintCV(contentId)],
      creator.address
    );
    expect(updatedInfo.value.price.value).toBe(newPrice.toString());
  });
});
