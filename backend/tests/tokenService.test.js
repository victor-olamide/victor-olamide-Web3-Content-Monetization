const axios = require('axios');
const { verifyFTBalance, verifyNFTOwnership } = require('../services/tokenService');

jest.mock('axios');

describe('tokenService', () => {
  const mockAddress = 'SP123456789012345678901234567890123456789';
  const mockContract = 'SP3D6PV2ACBPE58JSB6S2607V8J6HCHNC6X6K96RA.token-alex::alex';
  const mockNftContract = 'SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C.stacks-punks-v3::stacks-punks';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('verifyFTBalance should return true if balance is sufficient', async () => {
    axios.get.mockResolvedValue({
      data: {
        fungible_tokens: {
          [mockContract]: { balance: '100' }
        }
      }
    });

    const result = await verifyFTBalance(mockAddress, mockContract, 50);
    expect(result).toBe(true);
  });

  test('verifyFTBalance should return false if balance is insufficient', async () => {
    axios.get.mockResolvedValue({
      data: {
        fungible_tokens: {
          [mockContract]: { balance: '10' }
        }
      }
    });

    const result = await verifyFTBalance(mockAddress, mockContract, 50);
    expect(result).toBe(false);
  });

  test('verifyNFTOwnership should return true if count is sufficient', async () => {
    axios.get.mockResolvedValue({
      data: {
        non_fungible_tokens: {
          [mockNftContract]: { count: '1' }
        }
      }
    });

    const result = await verifyNFTOwnership(mockAddress, mockNftContract, 1);
    expect(result).toBe(true);
  });

  test('verifyNFTOwnership should return false if count is insufficient', async () => {
    axios.get.mockResolvedValue({
      data: {
        non_fungible_tokens: {
          [mockNftContract]: { count: '0' }
        }
      }
    });

    const result = await verifyNFTOwnership(mockAddress, mockNftContract, 1);
    expect(result).toBe(false);
  });
});
