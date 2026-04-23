import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Test 1: Creator can create subscription tier
Clarinet.test({
    name: "Creator can create subscription tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        let tierInfo = chain.callReadOnlyFn('subscription', 'get-tier-info', [
            types.principal(creator.address),
            types.uint(tierId)
        ], creator.address);

        const tier = tierInfo.result.expectSome().expectTuple();
        assertEquals(tier['price'], types.uint(price));
        assertEquals(tier['duration'], types.uint(duration));
        assertEquals(tier['active'], types.bool(true));
    },
});

// Test 2: User can subscribe to tier
Clarinet.test({
    name: "User can subscribe to tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'subscribe', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        // Verify subscription is active
        let isSubscribed = chain.callReadOnlyFn('subscription', 'is-subscribed', [
            types.principal(user.address),
            types.principal(creator.address),
            types.uint(tierId)
        ], user.address);

        assertEquals(isSubscribed.result, types.bool(true));
    },
});

// Test 3: Cannot create duplicate tier
Clarinet.test({
    name: "Cannot create duplicate tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectErr().expectUint(409); // ERR-ALREADY-EXISTS
    },
});

// Test 4: Cannot subscribe to non-existent tier
Clarinet.test({
    name: "Cannot subscribe to non-existent tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const tierId = 999; // Non-existent tier

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'subscribe', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(404); // ERR-NOT-FOUND
    },
});

// Test 5: Cannot subscribe to inactive tier
Clarinet.test({
    name: "Cannot subscribe to inactive tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'deactivate-tier', [
                types.uint(tierId)
            ], creator.address),
            Tx.contractCall('subscription', 'subscribe', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectErr().expectUint(400); // ERR-INVALID-TIER
    },
});

// Test 6: Creator can update tier
Clarinet.test({
    name: "Creator can update tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const tierId = 1;
        const originalPrice = 5000000;
        const originalDuration = 30;
        const newPrice = 7500000;
        const newDuration = 60;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(originalPrice),
                types.uint(originalDuration)
            ], creator.address),
            Tx.contractCall('subscription', 'update-tier', [
                types.uint(tierId),
                types.uint(newPrice),
                types.uint(newDuration),
                types.bool(true)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        let tierInfo = chain.callReadOnlyFn('subscription', 'get-tier-info', [
            types.principal(creator.address),
            types.uint(tierId)
        ], creator.address);

        const tier = tierInfo.result.expectSome().expectTuple();
        assertEquals(tier['price'], types.uint(newPrice));
        assertEquals(tier['duration'], types.uint(newDuration));
        assertEquals(tier['active'], types.bool(true));
    },
});

// Test 7: Non-creator cannot update tier
Clarinet.test({
    name: "Non-creator cannot update tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const nonCreator = accounts.get('wallet_1')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'update-tier', [
                types.uint(tierId),
                types.uint(7500000),
                types.uint(60),
                types.bool(true)
            ], nonCreator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectErr().expectUint(404); // ERR-NOT-FOUND
    },
});

// Test 8: Creator can deactivate tier
Clarinet.test({
    name: "Creator can deactivate tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'deactivate-tier', [
                types.uint(tierId)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        let tierInfo = chain.callReadOnlyFn('subscription', 'get-tier-info', [
            types.principal(creator.address),
            types.uint(tierId)
        ], creator.address);

        const tier = tierInfo.result.expectSome().expectTuple();
        assertEquals(tier['active'], types.bool(false));
    },
});

// Test 9: User can renew subscription
Clarinet.test({
    name: "User can renew subscription",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        // Create tier and subscribe
        let block1 = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'subscribe', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user.address)
        ]);

        // Mine some blocks to simulate time passing
        chain.mineEmptyBlock(100);

        // Renew subscription
        let block2 = chain.mineBlock([
            Tx.contractCall('subscription', 'renew-subscription', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user.address)
        ]);

        block1.receipts[0].result.expectOk().expectBool(true);
        block1.receipts[1].result.expectOk().expectBool(true);
        block2.receipts[0].result.expectOk().expectBool(true);

        // Verify subscription is still active
        let isSubscribed = chain.callReadOnlyFn('subscription', 'is-subscribed', [
            types.principal(user.address),
            types.principal(creator.address),
            types.uint(tierId)
        ], user.address);

        assertEquals(isSubscribed.result, types.bool(true));
    },
});

// Test 10: Cannot renew non-existent subscription
Clarinet.test({
    name: "Cannot renew non-existent subscription",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const tierId = 1;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'renew-subscription', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(404); // ERR-NOT-FOUND
    },
});

// Test 11: Contract owner can set platform fee
Clarinet.test({
    name: "Contract owner can set platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const newFee = 500; // 5%

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'set-platform-fee', [
                types.uint(newFee)
            ], owner.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    },
});

// Test 12: Non-owner cannot set platform fee
Clarinet.test({
    name: "Non-owner cannot set platform fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonOwner = accounts.get('wallet_1')!;
        const newFee = 500; // 5%

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'set-platform-fee', [
                types.uint(newFee)
            ], nonOwner.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(401); // ERR-NOT-AUTHORIZED
    },
});

// Test 13: Cannot set invalid platform fee (too high)
Clarinet.test({
    name: "Cannot set invalid platform fee (too high)",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const invalidFee = 1500; // 15% - too high

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'set-platform-fee', [
                types.uint(invalidFee)
            ], owner.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(405); // ERR-INVALID-FEE
    },
});

// Test 14: Subscription expires after duration
Clarinet.test({
    name: "Subscription expires after duration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30; // 30 days

        // Create tier and subscribe
        let block1 = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'subscribe', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user.address)
        ]);

        // Mine blocks to exceed duration (30 days * 144 blocks/day = 4320 blocks)
        chain.mineEmptyBlock(4321);

        // Check if subscription is expired
        let isSubscribed = chain.callReadOnlyFn('subscription', 'is-subscribed', [
            types.principal(user.address),
            types.principal(creator.address),
            types.uint(tierId)
        ], user.address);

        assertEquals(isSubscribed.result, types.bool(false));
    },
});

// Test 15: Multiple users can subscribe to same tier
Clarinet.test({
    name: "Multiple users can subscribe to same tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const tierId = 1;
        const price = 5000000;
        const duration = 30;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(price),
                types.uint(duration)
            ], creator.address),
            Tx.contractCall('subscription', 'subscribe', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user1.address),
            Tx.contractCall('subscription', 'subscribe', [
                types.principal(creator.address),
                types.uint(tierId)
            ], user2.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);

        // Verify both subscriptions are active
        let isSubscribed1 = chain.callReadOnlyFn('subscription', 'is-subscribed', [
            types.principal(user1.address),
            types.principal(creator.address),
            types.uint(tierId)
        ], user1.address);

        let isSubscribed2 = chain.callReadOnlyFn('subscription', 'is-subscribed', [
            types.principal(user2.address),
            types.principal(creator.address),
            types.uint(tierId)
        ], user2.address);

        assertEquals(isSubscribed1.result, types.bool(true));
        assertEquals(isSubscribed2.result, types.bool(true));
    },
});
                types.uint(tierId)
            ], user.address)
        ]);

        block.receipts[1].result.expectOk().expectBool(true);
        
        let isSubscribed = chain.callReadOnlyFn('subscription', 'is-subscribed', [
            types.principal(user.address),
            types.principal(creator.address),
            types.uint(tierId)
        ], user.address);
        
        isSubscribed.result.expectBool(true);
    },
});

Clarinet.test({
    name: "Creator can update tier",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const tierId = 1;
        const newPrice = 7000000;
        const newDuration = 60;

        let block = chain.mineBlock([
            Tx.contractCall('subscription', 'create-tier', [
                types.uint(tierId),
                types.uint(5000000),
                types.uint(30)
            ], creator.address),
            Tx.contractCall('subscription', 'update-tier', [
                types.uint(tierId),
                types.uint(newPrice),
                types.uint(newDuration),
                types.bool(true)
            ], creator.address)
        ]);

        block.receipts[1].result.expectOk().expectBool(true);
        
        let tierInfo = chain.callReadOnlyFn('subscription', 'get-tier-info', [
            types.principal(creator.address),
            types.uint(tierId)
        ], creator.address);
        
        const tier = tierInfo.result.expectSome().expectTuple();
        assertEquals(tier['price'], types.uint(newPrice));
        assertEquals(tier['duration'], types.uint(newDuration));
    },
});
