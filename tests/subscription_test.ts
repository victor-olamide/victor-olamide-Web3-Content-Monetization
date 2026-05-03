import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

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
