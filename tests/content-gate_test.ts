import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Test 1: Creator can set FT gating rule
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

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);

        const gatingRule = rule.result.expectSome().expectTuple();
        assertEquals(gatingRule['threshold'], types.uint(threshold));
        assertEquals(gatingRule['gating-type'], types.uint(0));
    },
});

// Test 2: Creator can set NFT gating rule
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
                types.uint(1), // NFT threshold (ownership required)
                types.uint(1) // NFT gating type
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);

        const gatingRule = rule.result.expectSome().expectTuple();
        assertEquals(gatingRule['gating-type'], types.uint(1));
    },
});

// Test 3: Non-creator cannot set gating rule
Clarinet.test({
    name: "Non-creator cannot set gating rule",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const nonCreator = accounts.get('wallet_1')!;
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
            ], nonCreator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectErr().expectUint(401); // ERR-NOT-AUTHORIZED
    },
});

// Test 4: Cannot set gating rule for non-existent content
Clarinet.test({
    name: "Cannot set gating rule for non-existent content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 999; // Non-existent content
        const threshold = 100;

        let block = chain.mineBlock([
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-token`),
                types.uint(threshold),
                types.uint(0)
            ], creator.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(404); // ERR-CONTENT-NOT-FOUND
    },
});

// Test 5: Cannot set invalid gating type
Clarinet.test({
    name: "Cannot set invalid gating type",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 1;
        const threshold = 100;
        const invalidType = 999; // Invalid gating type

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
                types.uint(invalidType)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectErr().expectUint(400); // ERR-INVALID-GATING-TYPE
    },
});

// Test 6: Creator can delete gating rule
Clarinet.test({
    name: "Creator can delete gating rule",
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
            ], creator.address),
            Tx.contractCall('content-gate', 'delete-gating-rule', [
                types.uint(contentId)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);

        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);

        assertEquals(rule.result, types.none());
    },
});

// Test 7: Contract owner can delete any gating rule
Clarinet.test({
    name: "Contract owner can delete any gating rule",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const owner = accounts.get('deployer')!;
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
            ], creator.address),
            Tx.contractCall('content-gate', 'delete-gating-rule', [
                types.uint(contentId)
            ], owner.address) // Contract owner deleting rule
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);
    },
});

// Test 8: Non-creator and non-owner cannot delete gating rule
Clarinet.test({
    name: "Non-creator and non-owner cannot delete gating rule",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const nonCreator = accounts.get('wallet_1')!;
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
            ], creator.address),
            Tx.contractCall('content-gate', 'delete-gating-rule', [
                types.uint(contentId)
            ], nonCreator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectErr().expectUint(401); // ERR-NOT-AUTHORIZED
    },
});

// Test 9: Can get gating rule information
Clarinet.test({
    name: "Can get gating rule information",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 1;
        const threshold = 100;
        const tokenContract = `${creator.address}.mock-token`;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(1000000),
                types.ascii("ipfs://test")
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(tokenContract),
                types.uint(threshold),
                types.uint(0)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        // Test get-gating-type
        let gatingType = chain.callReadOnlyFn('content-gate', 'get-gating-type', [
            types.uint(contentId)
        ], creator.address);

        assertEquals(gatingType.result.expectOk(), types.uint(0));

        // Test get-required-token
        let requiredToken = chain.callReadOnlyFn('content-gate', 'get-required-token', [
            types.uint(contentId)
        ], creator.address);

        assertEquals(requiredToken.result.expectOk(), types.principal(tokenContract));

        // Test get-gating-threshold
        let gatingThreshold = chain.callReadOnlyFn('content-gate', 'get-gating-threshold', [
            types.uint(contentId)
        ], creator.address);

        assertEquals(gatingThreshold.result.expectOk(), types.uint(threshold));
    },
});

// Test 10: Read-only functions return none for non-existent rules
Clarinet.test({
    name: "Read-only functions return none for non-existent rules",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 999; // Non-existent content

        let gatingType = chain.callReadOnlyFn('content-gate', 'get-gating-type', [
            types.uint(contentId)
        ], creator.address);

        let requiredToken = chain.callReadOnlyFn('content-gate', 'get-required-token', [
            types.uint(contentId)
        ], creator.address);

        let gatingThreshold = chain.callReadOnlyFn('content-gate', 'get-gating-threshold', [
            types.uint(contentId)
        ], creator.address);

        assertEquals(gatingType.result, types.err(404));
        assertEquals(requiredToken.result, types.err(404));
        assertEquals(gatingThreshold.result, types.err(404));
    },
});

// Test 11: Can update existing gating rule
Clarinet.test({
    name: "Can update existing gating rule",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 1;
        const originalThreshold = 100;
        const newThreshold = 200;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(1000000),
                types.ascii("ipfs://test")
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-token`),
                types.uint(originalThreshold),
                types.uint(0)
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-token`),
                types.uint(newThreshold),
                types.uint(0)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);

        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);

        const gatingRule = rule.result.expectSome().expectTuple();
        assertEquals(gatingRule['threshold'], types.uint(newThreshold));
    },
});

// Test 12: Multiple content can have different gating rules
Clarinet.test({
    name: "Multiple content can have different gating rules",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId1 = 1;
        const contentId2 = 2;
        const threshold1 = 100;
        const threshold2 = 50;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId1),
                types.uint(1000000),
                types.ascii("ipfs://test1")
            ], creator.address),
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId2),
                types.uint(1000000),
                types.ascii("ipfs://test2")
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId1),
                types.principal(`${creator.address}.mock-token`),
                types.uint(threshold1),
                types.uint(0) // FT
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId2),
                types.principal(`${creator.address}.mock-nft`),
                types.uint(threshold2),
                types.uint(1) // NFT
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);
        block.receipts[3].result.expectOk().expectBool(true);

        // Verify different rules
        let rule1 = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId1)
        ], creator.address);

        let rule2 = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId2)
        ], creator.address);

        const gatingRule1 = rule1.result.expectSome().expectTuple();
        const gatingRule2 = rule2.result.expectSome().expectTuple();

        assertEquals(gatingRule1['threshold'], types.uint(threshold1));
        assertEquals(gatingRule1['gating-type'], types.uint(0));
        assertEquals(gatingRule2['threshold'], types.uint(threshold2));
        assertEquals(gatingRule2['gating-type'], types.uint(1));
    },
});

// Test 13: Different creators can set rules for their content
Clarinet.test({
    name: "Different creators can set rules for their content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator1 = accounts.get('deployer')!;
        const creator2 = accounts.get('wallet_1')!;
        const contentId1 = 1;
        const contentId2 = 2;
        const threshold = 100;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId1),
                types.uint(1000000),
                types.ascii("ipfs://test1")
            ], creator1.address),
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId2),
                types.uint(1000000),
                types.ascii("ipfs://test2")
            ], creator2.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId1),
                types.principal(`${creator1.address}.mock-token`),
                types.uint(threshold),
                types.uint(0)
            ], creator1.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId2),
                types.principal(`${creator2.address}.mock-token`),
                types.uint(threshold),
                types.uint(0)
            ], creator2.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);
        block.receipts[3].result.expectOk().expectBool(true);

        // Verify both rules exist
        let rule1 = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId1)
        ], creator1.address);

        let rule2 = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId2)
        ], creator2.address);

        assertEquals(rule1.result.expectSome().expectTuple()['threshold'], types.uint(threshold));
        assertEquals(rule2.result.expectSome().expectTuple()['threshold'], types.uint(threshold));
    },
});

// Test 14: Zero threshold is allowed for FT gating
Clarinet.test({
    name: "Zero threshold is allowed for FT gating",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 1;
        const threshold = 0; // Zero threshold

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

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);

        const gatingRule = rule.result.expectSome().expectTuple();
        assertEquals(gatingRule['threshold'], types.uint(0));
    },
});

// Test 15: Can delete rule and set new rule for same content
Clarinet.test({
    name: "Can delete rule and set new rule for same content",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const creator = accounts.get('deployer')!;
        const contentId = 1;
        const threshold1 = 100;
        const threshold2 = 200;

        let block = chain.mineBlock([
            Tx.contractCall('pay-per-view', 'add-content', [
                types.uint(contentId),
                types.uint(1000000),
                types.ascii("ipfs://test")
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-token`),
                types.uint(threshold1),
                types.uint(0)
            ], creator.address),
            Tx.contractCall('content-gate', 'delete-gating-rule', [
                types.uint(contentId)
            ], creator.address),
            Tx.contractCall('content-gate', 'set-gating-rule', [
                types.uint(contentId),
                types.principal(`${creator.address}.mock-token`),
                types.uint(threshold2),
                types.uint(0)
            ], creator.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        block.receipts[2].result.expectOk().expectBool(true);
        block.receipts[3].result.expectOk().expectBool(true);

        let rule = chain.callReadOnlyFn('content-gate', 'get-gating-rule', [
            types.uint(contentId)
        ], creator.address);

        const gatingRule = rule.result.expectSome().expectTuple();
        assertEquals(gatingRule['threshold'], types.uint(threshold2));
    },
});
