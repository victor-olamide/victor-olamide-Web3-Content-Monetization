const Purchase = require('../models/Purchase');

describe('Purchase Model', () => {
  test('should create a valid purchase object', () => {
    const purchaseData = {
      contentId: 1,
      user: 'SP3X...user',
      txId: '0x123...abc',
      amount: 10
    };
    
    const purchase = new Purchase(purchaseData);
    
    expect(purchase.contentId).toBe(purchaseData.contentId);
    expect(purchase.user).toBe(purchaseData.user);
    expect(purchase.txId).toBe(purchaseData.txId);
    expect(purchase.amount).toBe(purchaseData.amount);
    expect(purchase.timestamp).toBeDefined();
  });

  test('should require mandatory fields', () => {
    const purchase = new Purchase({});
    const err = purchase.validateSync();
    
    expect(err.errors.contentId).toBeDefined();
    expect(err.errors.user).toBeDefined();
    expect(err.errors.txId).toBeDefined();
    expect(err.errors.amount).toBeDefined();
  });
});
