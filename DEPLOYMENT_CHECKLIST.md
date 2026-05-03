# Pre-Deployment Checklist

## Before Deploying to Testnet

- [ ] All contracts pass `clarinet check`
- [ ] All tests pass with `clarinet test`
- [ ] Test coverage is adequate (>80%)
- [ ] Testnet mnemonic configured in `settings/Testnet.toml`
- [ ] Deployer wallet has sufficient STX for gas fees
- [ ] Deployment plan reviewed (`deployments/testnet.plan.yaml`)
- [ ] Contract dependencies are correct
- [ ] All contract functions are tested
- [ ] Error handling is comprehensive

## Before Deploying to Mainnet

- [ ] Successfully deployed and tested on testnet
- [ ] All testnet functionality verified
- [ ] Security audit completed (if applicable)
- [ ] Mainnet mnemonic configured in `settings/Mainnet.toml`
- [ ] Deployer wallet has sufficient STX (estimate: 0.5-1 STX)
- [ ] Deployment plan reviewed (`deployments/mainnet.plan.yaml`)
- [ ] Team approval obtained
- [ ] Rollback plan prepared
- [ ] Monitoring setup ready
- [ ] Documentation updated

## Post-Deployment

- [ ] Verify all contracts deployed successfully
- [ ] Test basic functionality on deployed contracts
- [ ] Update frontend with new contract addresses
- [ ] Update backend configuration
- [ ] Announce deployment to users
- [ ] Monitor for any issues
- [ ] Document deployment details (tx IDs, addresses)

## Emergency Contacts

- Deployer: [Your contact]
- Technical Lead: [Contact]
- Security Team: [Contact]

## Deployment Costs (Estimated)

### Testnet
- Trait contracts: ~5,000 µSTX each
- Core contracts: ~15,000 µSTX each
- Dependent contracts: ~20,000 µSTX each
- **Total: ~75,000 µSTX (0.075 STX)**

### Mainnet
- Similar costs but with real STX
- **Recommended balance: 1 STX minimum**

## Rollback Procedure

If deployment fails or issues are discovered:

1. Do not panic
2. Document the issue
3. Stop any ongoing transactions
4. Assess impact
5. Deploy fix or revert if possible
6. Communicate with users
7. Post-mortem analysis
