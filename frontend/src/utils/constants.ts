export const STACKS_NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
export const CONTRACT_NAME = 'pay-per-view';
export const CONTENT_GATE_CONTRACT = 'content-gate';
export const SUBSCRIPTION_CONTRACT = 'subscription';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** Stacks blockchain node API base URL — configurable per environment. */
export const STACKS_API_BASE =
  process.env.NEXT_PUBLIC_STACKS_API_URL ||
  (STACKS_NETWORK === 'mainnet'
    ? 'https://stacks-node-api.mainnet.stacks.co'
    : 'https://stacks-node-api.testnet.stacks.co');

/** Stacks block explorer base URL — configurable per environment. */
export const STACKS_EXPLORER_BASE =
  process.env.NEXT_PUBLIC_STACKS_EXPLORER_URL || 'https://explorer.stacks.co';

/** Chain parameter appended to explorer links (mainnet | testnet). */
export const STACKS_CHAIN = STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
