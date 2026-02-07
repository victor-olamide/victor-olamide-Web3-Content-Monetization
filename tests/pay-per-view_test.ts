import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

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

        block.receipts[1].result.expectOk().expectBool(true);
        
        let hasAccess = chain.callReadOnlyFn('pay-per-view', 'has-access', [
            types.uint(contentId),
            types.principal(user.address)
        ], user.address);
        
        hasAccess.result.expectBool(true);
    },
});

Clarinet.test({
    name: "Cannot purchase same content twice",
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

        block.receipts[2].result.expectErr().expectUint(403);
    },
});

Clarinet.test({
    name: "Platform fee is calculated correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const price = 1000000;

        let feeResult = chain.callReadOnlyFn('pay-per-view', 'calculate-platform-fee', [
            types.uint(price)
        ], deployer.address);
        
        feeResult.result.expectUint(25000);
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
