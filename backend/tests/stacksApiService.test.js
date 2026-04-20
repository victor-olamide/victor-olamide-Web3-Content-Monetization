const { verifyTransaction, waitForConfirmation } = require('../../services/stacksApiService');
const axios = require('axios');

jest.mock('axios');

describe('Stacks API Service - Issue #151', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyTransaction', () => {
    it('should return transaction details for successful transaction', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      axios.get.mockResolvedValueOnce({
        data: {
          tx_id: txId,
          tx_status: 'success',
          block_height: 12345,
          burn_block_time_iso: '2024-04-15T10:00:00Z',
          confirmations: 10
        }
      });

      const result = await verifyTransaction(txId);

      expect(result.txId).toBe(txId);
      expect(result.status).toBe('success');
      expect(result.success).toBe(true);
      expect(result.blockHeight).toBe(12345);
      expect(result.confirmations).toBe(10);
    });

    it('should return not_found status for missing transaction', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      axios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      const result = await verifyTransaction(txId);

      expect(result.status).toBe('not_found');
      expect(result.success).toBe(false);
    });

    it('should handle failed transactions', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      axios.get.mockResolvedValueOnce({
        data: {
          tx_id: txId,
          tx_status: 'abort_by_response'
        }
      });

      const result = await verifyTransaction(txId);

      expect(result.status).toBe('abort_by_response');
      expect(result.success).toBe(false);
    });

    it('should throw error on network failure', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(verifyTransaction(txId)).rejects.toThrow('Failed to verify transaction');
    });
  });

  describe('waitForConfirmation', () => {
    it('should return confirmed transaction details', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      axios.get.mockResolvedValueOnce({
        data: {
          tx_id: txId,
          tx_status: 'success',
          block_height: 12345,
          burn_block_time_iso: '2024-04-15T10:00:00Z',
          confirmations: 5
        }
      });

      const result = await waitForConfirmation(txId, 1, 100);

      expect(result.status).toBe('success');
      expect(result.success).toBe(true);
    });

    it('should throw error on transaction abort', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      axios.get.mockResolvedValueOnce({
        data: {
          tx_id: txId,
          tx_status: 'abort_by_post_condition'
        }
      });

      await expect(waitForConfirmation(txId, 1, 100)).rejects.toThrow('Transaction failed');
    });

    it('should timeout after max attempts', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      axios.get.mockResolvedValue({
        data: {
          tx_id: txId,
          tx_status: 'pending'
        }
      });

      await expect(waitForConfirmation(txId, 2, 10)).rejects.toThrow('confirmation timeout');
    });
  });
});
