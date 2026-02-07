import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Creator can set FT gating rule",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 1;
        const threshold = 100;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(1000000),
                types.ascii("ipfs://test")
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-token`),
                types.uint(threshold),
                types.uint(0)
            ], creator.address)
        ]);

        block.receipts[1].result.expectOk().expectBool(true);
        
        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);
        
        const gatingRule = rule.result.expectSome().expectTuple();
        assertEquals(gatingRule['threshold'], types.uint(threshold));
        assertEquals(gatingRule['gating-type'], types.uint(0));
    },
});

Clarinet.test({
    name: "Creator can set NFT gating rule",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 2;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(1000000),
                types.ascii("ipfs://test2")
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-nft`),
                types.uint(1),
                types.uint(1)
            ], creator.address)
        ]);

        block.receipts[1].result.expectOk().expectBool(true);
        
        let gatingType = chain.callReadOnlyFn('content-gate', 'get-gating-type', [
            types.uint(contentId)
        ], creator.address);
        
        gatingType.result.expectOk().expectUint(1);
    },
});

Clarinet.test({
    name: "Creator can delete gating rule",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 1;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(1000000),
                types.ascii("ipfs://test")
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-token`),
                types.uint(100),
                types.uint(0)
            ], creator.address),
            Tx.contractCall('content-gate', 'delete-gating-rule', [
                types.uint(contentId)
            ], creator.address)
        ]);

        block.receipts[2].result.expectOk().expectBool(true);
        
        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);
        
        rule.result.expectNone();
    },
});
