import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Test 1: Can add content with price and URI
Clarinet.test({
    name: "Can add content with price and URI",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const contentId = 1;
        const price = 1000000;
        const uri = "ipfs://QmTest123";

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii(uri)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        let contentInfo = chain.callReadOnlyFn('pay-per-view', 'get-content-info', [
            types.uint(contentId)
        ], deployer.address);

        const content = contentInfo.result.expectSome().expectTuple();
        assertEquals(content['price'], types.uint(price));
        assertEquals(content['creator'], deployer.address);
    },
});

// Test 2: User can purchase content
Clarinet.test({
    name: "User can purchase content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        // Verify user has access
        let hasAccess = chain.callReadOnlyFn('pay-per-view', 'has-access', [
            types.uint(contentId),
            types.principal(user.address)
        ], user.address);

        assertEquals(hasAccess.result, types.bool(true));
    },
});

// Test 3: Cannot add duplicate content
Clarinet.test({
    name: "Cannot add duplicate content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test1")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test2")
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectErr().expectUint(409); // ERR-ALREADY-EXISTS
    },
});

// Test 4: Cannot purchase non-existent content
Clarinet.test({
    name: "Cannot purchase non-existent content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;
        const contentId = 999; // Non-existent content

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(404); // ERR-NOT-FOUND
    },
});

// Test 5: Cannot purchase content twice
Clarinet.test({
    name: "Cannot purchase content twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectErr().expectUint(403); // ERR-ALREADY-PURCHASED
    },
});

// Test 6: Creator can update content price
Clarinet.test({
    name: "Creator can update content price",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const contentId = 1;
        const originalPrice = 1000000;
        const newPrice = 2000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(originalPrice),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'update-content-price', [
                types.uint(contentId),
                types.uint(newPrice)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        let contentInfo = chain.callReadOnlyFn('pay-per-view', 'get-content-info', [
            types.uint(contentId)
        ], deployer.address);

        const content = contentInfo.result.expectSome().expectTuple();
        assertEquals(content['price'], types.uint(newPrice));
    },
});

// Test 7: Non-creator cannot update content price
Clarinet.test({
    name: "Non-creator cannot update content price",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const nonCreator = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'update-content-price', [
                types.uint(contentId),
                types.uint(2000000)
            ], nonCreator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectErr().expectUint(401); // ERR-NOT-AUTHORIZED
    },
});

// Test 8: Creator can remove content
Clarinet.test({
    name: "Creator can remove content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'remove-content', [
                types.uint(contentId)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        let contentInfo = chain.callReadOnlyFn('pay-per-view', 'get-content-info', [
            types.uint(contentId)
        ], deployer.address);

        assertEquals(contentInfo.result, types.none());
    },
});

// Test 9: Contract owner can remove any content
Clarinet.test({
    name: "Contract owner can remove any content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const creator = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], creator.address),
            Tx.contractCall('pay-per-view', 'remove-content', [
                types.uint(contentId)
            ], deployer.address) // Contract owner removing content
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
    },
});

// Test 10: Creator can refund user within window
Clarinet.test({
    name: "Creator can refund user within window",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        // Mine some blocks but stay within refund window (144 blocks = ~24 hours)
        chain.mineEmptyBlock(50);

        let refundBlock = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'refund-user', [
                types.uint(contentId),
                types.principal(user.address)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        refundBlock.receipts[0].result.expectOk().expectBool(true);

        // Verify user no longer has access
        let hasAccess = chain.callReadOnlyFn('pay-per-view', 'has-access', [
            types.uint(contentId),
            types.principal(user.address)
        ], user.address);

        assertEquals(hasAccess.result, types.bool(false));
    },
});

// Test 11: Cannot refund after window expires
Clarinet.test({
    name: "Cannot refund after window expires",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        // Mine blocks to exceed refund window (144 blocks = ~24 hours)
        chain.mineEmptyBlock(200);

        let refundBlock = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'refund-user', [
                types.uint(contentId),
                types.principal(user.address)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        refundBlock.receipts[0].result.expectErr().expectUint(406); // ERR-REFUND-FAILED
    },
});

// Test 12: Contract owner can set platform fee
Clarinet.test({
    name: "Contract owner can set platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const newFee = 500; // 5%

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-fee', [
                types.uint(newFee)
            ], owner.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    },
});

// Test 13: Non-owner cannot set platform fee
Clarinet.test({
    name: "Non-owner cannot set platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonOwner = accounts.get('wallet_1')!;
        const newFee = 500; // 5%

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-fee', [
                types.uint(newFee)
            ], nonOwner.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(401); // ERR-NOT-AUTHORIZED
    },
});

// Test 14: Cannot set invalid platform fee
Clarinet.test({
    name: "Cannot set invalid platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const invalidFee = 1500; // 15% - too high

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-fee', [
                types.uint(invalidFee)
            ], owner.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(405); // ERR-INVALID-FEE
    },
});

// Test 15: Contract can be paused and unpaused by owner
Clarinet.test({
    name: "Contract can be paused and unpaused by owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        // Pause contract
        let pauseBlock = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'pause-contract', [], owner.address)
        ]);

        pauseBlock.receipts[0].result.expectOk().expectBool(true);

        // Try to add content while paused
        let pausedBlock = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], user.address)
        ]);

        pausedBlock.receipts[0].result.expectErr().expectUint(507); // ERR-CONTRACT-PAUSED

        // Unpause contract
        let unpauseBlock = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'unpause-contract', [], owner.address)
        ]);

        unpauseBlock.receipts[0].result.expectOk().expectBool(true);

        // Now content can be added
        let normalBlock = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], user.address)
        ]);

        normalBlock.receipts[0].result.expectOk().expectBool(true);
    },
});

// Test 16: Non-owner cannot pause contract
Clarinet.test({
    name: "Non-owner cannot pause contract",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonOwner = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'pause-contract', [], nonOwner.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(401); // ERR-NOT-AUTHORIZED
    },
});

// Test 17: Platform fee calculation works correctly
Clarinet.test({
    name: "Platform fee calculation works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Test with default 2.5% fee
        let fee1 = chain.callReadOnlyFn('pay-per-view', 'calculate-platform-fee', [
            types.uint(1000000) // 1 STX
        ], deployer.address);

        assertEquals(fee1.result, types.uint(25000)); // 0.025 STX

        // Test with different amount
        let fee2 = chain.callReadOnlyFn('pay-per-view', 'calculate-platform-fee', [
            types.uint(2000000) // 2 STX
        ], deployer.address);

        assertEquals(fee2.result, types.uint(50000)); // 0.05 STX
    },
});

// Test 18: Creator amount calculation works correctly
Clarinet.test({
    name: "Creator amount calculation works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Test with default 2.5% fee
        let creatorAmount = chain.callReadOnlyFn('pay-per-view', 'calculate-creator-amount', [
            types.uint(1000000) // 1 STX
        ], deployer.address);

        assertEquals(creatorAmount.result, types.uint(975000)); // 0.975 STX (1 - 0.025)
    },
});

// Test 19: Contract owner can set platform wallet
Clarinet.test({
    name: "Contract owner can set platform wallet",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const newWallet = accounts.get('wallet_1')!.address;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-wallet', [
                types.principal(newWallet)
            ], owner.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    },
});

// Test 20: Contract owner can set refund window
Clarinet.test({
    name: "Contract owner can set refund window",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const newWindow = 288; // 48 hours

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-refund-window', [
                types.uint(newWindow)
            ], owner.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    },
});

// Test 21: Multiple users can purchase different content
Clarinet.test({
    name: "Multiple users can purchase different content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const contentId1 = 1;
        const contentId2 = 2;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId1),
                types.uint(price),
                types.ascii("ipfs://test1")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId2),
                types.uint(price),
                types.ascii("ipfs://test2")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId1)
            ], user1.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId2)
            ], user2.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);
        block.receipts[3].result.expectOk().expectBool(true);

        // Verify both users have access to their respective content
        let hasAccess1 = chain.callReadOnlyFn('pay-per-view', 'has-access', [
            types.uint(contentId1),
            types.principal(user1.address)
        ], user1.address);

        let hasAccess2 = chain.callReadOnlyFn('pay-per-view', 'has-access', [
            types.uint(contentId2),
            types.principal(user2.address)
        ], user2.address);

        assertEquals(hasAccess1.result, types.bool(true));
        assertEquals(hasAccess2.result, types.bool(true));
    },
});

// Test 22: Purchase records block height correctly
Clarinet.test({
    name: "Purchase records block height correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        // The purchase should be recorded at the current block height
        // Since we mined one block with 2 transactions, the purchase block should be the current height
        const purchaseBlock = block.height;

        // Verify the purchase block is recorded
        let purchaseBlockCheck = chain.callReadOnlyFn('pay-per-view', 'get-purchase-block', [
            types.uint(contentId),
            types.principal(user.address)
        ], user.address);

        assertEquals(purchaseBlockCheck.result.expectSome(), types.uint(purchaseBlock));
    },
});

Clarinet.test({
    name: "Creator amount is calculated correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const price = 1000000;

        let amountResult = chain.callReadOnlyFn('pay-per-view', 'calculate-creator-amount', [
            types.uint(price)
        ], deployer.address);
        
        amountResult.result.expectUint(975000);
    },
});

Clarinet.test({
    name: "Platform fee is collected on purchase",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const platform = accounts.get('wallet_2')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-wallet', [
                types.principal(platform.address)
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        block.receipts[2].result.expectOk().expectBool(true);
        
        const platformBalance = chain.getAssetsMaps().assets['STX'][platform.address];
        assertEquals(platformBalance, 100000000 + 25000);
    },
});

Clarinet.test({
    name: "Creator receives correct amount after platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const platform = accounts.get('wallet_2')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-wallet', [
                types.principal(platform.address)
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        block.receipts[2].result.expectOk().expectBool(true);
        
        const creatorBalance = chain.getAssetsMaps().assets['STX'][deployer.address];
        assertEquals(creatorBalance, 100000000 + 975000);
    },
});

Clarinet.test({
    name: "Only owner can set platform wallet",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const newWallet = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-wallet', [
                types.principal(newWallet.address)
            ], user.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(401);
    },
});

Clarinet.test({
    name: "Can retrieve platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let feeResult = chain.callReadOnlyFn('pay-per-view', 'get-platform-fee', [], deployer.address);
        
        feeResult.result.expectUint(250);
    },
});

Clarinet.test({
    name: "Can retrieve platform wallet",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let walletResult = chain.callReadOnlyFn('pay-per-view', 'get-platform-wallet', [], deployer.address);
        
        walletResult.result.expectPrincipal(deployer.address);
    },
});

Clarinet.test({
    name: "Owner can update platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const newFee = 500;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-platform-fee', [
                types.uint(newFee)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        
        let feeResult = chain.callReadOnlyFn('pay-per-view', 'get-platform-fee', [], deployer.address);
        feeResult.result.expectUint(newFee);
    },
});

Clarinet.test({
    name: "Platform fee calculation works with different amounts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let fee1 = chain.callReadOnlyFn('pay-per-view', 'calculate-platform-fee', [
            types.uint(5000000)
        ], deployer.address);
        fee1.result.expectUint(125000);

        let fee2 = chain.callReadOnlyFn('pay-per-view', 'calculate-platform-fee', [
            types.uint(100000)
        ], deployer.address);
        fee2.result.expectUint(2500);
    },
});

Clarinet.test({
    name: "User is eligible for refund within window",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address)
        ]);

        let eligible = chain.callReadOnlyFn('pay-per-view', 'is-eligible-for-refund', [
            types.uint(contentId),
            types.principal(user.address)
        ], user.address);
        
        eligible.result.expectBool(true);
    },
});

Clarinet.test({
    name: "Creator can refund eligible user",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address),
            Tx.contractCall('pay-per-view', 'refund-user', [
                types.uint(contentId),
                types.principal(user.address)
            ], deployer.address)
        ]);

        block.receipts[2].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "User loses access after refund",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address),
            Tx.contractCall('pay-per-view', 'refund-user', [
                types.uint(contentId),
                types.principal(user.address)
            ], deployer.address)
        ]);

        let hasAccess = chain.callReadOnlyFn('pay-per-view', 'has-access', [
            types.uint(contentId),
            types.principal(user.address)
        ], user.address);
        
        hasAccess.result.expectBool(false);
    },
});

Clarinet.test({
    name: "Only creator can issue refunds",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const other = accounts.get('wallet_2')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user.address),
            Tx.contractCall('pay-per-view', 'refund-user', [
                types.uint(contentId),
                types.principal(user.address)
            ], other.address)
        ]);

        block.receipts[2].result.expectErr().expectUint(401);
    },
});

Clarinet.test({
    name: "Creator can remove content with refunds",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const contentId = 1;
        const price = 1000000;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(price),
                types.ascii("ipfs://test")
            ], deployer.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user1.address),
            Tx.contractCall('pay-per-view', 'purchase-content', [
                types.uint(contentId)
            ], user2.address),
            Tx.contractCall('pay-per-view', 'remove-content-with-refunds', [
                types.uint(contentId),
                types.list([types.principal(user1.address), types.principal(user2.address)])
            ], deployer.address)
        ]);

        block.receipts[3].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Can retrieve refund window",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let windowResult = chain.callReadOnlyFn('pay-per-view', 'get-refund-window', [], deployer.address);
        
        windowResult.result.expectUint(144);
    },
});

Clarinet.test({
    name: "Only owner can set refund window",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'set-refund-window', [
                types.uint(288)
            ], user.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(401);
    },
});
