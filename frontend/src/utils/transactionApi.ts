/**
 * Transaction API Utilities
 * Typed wrappers for all transaction endpoints
 */

const API_BASE_URL = '/api/transactions';

const getSessionHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Session-Id': localStorage.getItem('sessionId') || ''
});

/**
 * Get transaction history with pagination, filters, and sorting
 */
export async function getTransactionHistory(params: {
  skip?: number;
  limit?: number;
  status?: string;
  type?: string;
  category?: string;
  sortBy?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.type) queryParams.append('type', params.type);
  if (params.category) queryParams.append('category', params.category);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const response = await fetch(
    `${API_BASE_URL}/history?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: getSessionHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch transaction history');
  }

  return response.json();
}

/**
 * Get transaction summary with aggregated statistics
 */
export async function getTransactionSummary() {
  const response = await fetch(`${API_BASE_URL}/summary`, {
    method: 'GET',
    headers: getSessionHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch transaction summary');
  }

  return response.json();
}

/**
 * Get user transaction statistics
 */
export async function getTransactionStats() {
  const response = await fetch(`${API_BASE_URL}/stats`, {
    method: 'GET',
    headers: getSessionHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch transaction stats');
  }

  return response.json();
}

/**
 * Get pending (unconfirmed) transactions
 */
export async function getPendingTransactions(params?: {
  skip?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/pending?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: getSessionHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch pending transactions');
  }

  return response.json();
}

/**
 * Get transactions filtered by type
 */
export async function getTransactionsByType(
  type: string,
  params?: {
    skip?: number;
    limit?: number;
  }
) {
  const queryParams = new URLSearchParams();
  
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/by-type/${type}?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: getSessionHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to fetch ${type} transactions`);
  }

  return response.json();
}

/**
 * Get transactions filtered by category
 */
export async function getTransactionsByCategory(
  category: string,
  params?: {
    skip?: number;
    limit?: number;
  }
) {
  const queryParams = new URLSearchParams();
  
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/by-category/${category}?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: getSessionHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to fetch ${category} transactions`);
  }

  return response.json();
}

/**
 * Get transactions within a date range
 */
export async function getTransactionsByDateRange(params: {
  startDate: string;
  endDate: string;
  skip?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  
  queryParams.append('startDate', params.startDate);
  queryParams.append('endDate', params.endDate);
  if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/date-range?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: getSessionHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch transactions in date range');
  }

  return response.json();
}

/**
 * Get monthly transaction summary
 */
export async function getMonthlyTransactionSummary(year: number, month: number) {
  const response = await fetch(
    `${API_BASE_URL}/monthly/${year}/${month}`,
    {
      method: 'GET',
      headers: getSessionHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch monthly summary');
  }

  return response.json();
}

/**
 * Get balance over time
 */
export async function getBalanceOverTime(days: number = 30) {
  const queryParams = new URLSearchParams();
  queryParams.append('days', days.toString());

  const response = await fetch(
    `${API_BASE_URL}/balance-over-time?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: getSessionHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch balance history');
  }

  return response.json();
}

/**
 * Get single transaction by ID
 */
export async function getTransactionById(transactionId: string) {
  const response = await fetch(`${API_BASE_URL}/${transactionId}`, {
    method: 'GET',
    headers: getSessionHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch transaction');
  }

  return response.json();
}

/**
 * Get transaction by blockchain hash
 */
export async function getTransactionByHash(txHash: string) {
  const response = await fetch(`${API_BASE_URL}/hash/${txHash}`, {
    method: 'GET',
    headers: getSessionHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch transaction by hash');
  }

  return response.json();
}

/**
 * Record a new transaction
 */
export async function recordTransaction(data: {
  transactionType: string;
  amount: number;
  amountUsd: number;
  stxPrice: number;
  description: string;
  category: string;
  txHash?: string;
  blockHeight?: number;
  status?: string;
  relatedContentId?: string;
  relatedAddress?: string;
  metadata?: Record<string, any>;
}) {
  const response = await fetch(`${API_BASE_URL}`, {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to record transaction');
  }

  return response.json();
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  txHash: string,
  data: {
    status: string;
    blockHeight?: number;
    blockTime?: string;
    confirmations?: number;
  }
) {
  const response = await fetch(`${API_BASE_URL}/${txHash}/status`, {
    method: 'PUT',
    headers: getSessionHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update transaction status');
  }

  return response.json();
}

/**
 * Update transaction confirmations
 */
export async function updateTransactionConfirmations(
  txHash: string,
  confirmations: number,
  blockHeight?: number
) {
  const data: any = { confirmations };
  if (blockHeight !== undefined) {
    data.blockHeight = blockHeight;
  }

  const response = await fetch(`${API_BASE_URL}/${txHash}/confirmations`, {
    method: 'PUT',
    headers: getSessionHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update confirmations');
  }

  return response.json();
}

/**
 * Export transactions for tax reporting
 */
export async function exportForTaxReporting(year: number) {
  const response = await fetch(`${API_BASE_URL}/export/tax/${year}`, {
    method: 'GET',
    headers: getSessionHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to export tax data');
  }

  return response.json();
}

export default {
  getTransactionHistory,
  getTransactionSummary,
  getTransactionStats,
  getPendingTransactions,
  getTransactionsByType,
  getTransactionsByCategory,
  getTransactionsByDateRange,
  getMonthlyTransactionSummary,
  getBalanceOverTime,
  getTransactionById,
  getTransactionByHash,
  recordTransaction,
  updateTransactionStatus,
  updateTransactionConfirmations,
  exportForTaxReporting
};
