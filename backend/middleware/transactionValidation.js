/**
 * Transaction Validation Middleware
 * Validates transaction data and query parameters
 */

/**
 * Validate transaction recording data
 */
const validateTransactionData = (req, res, next) => {
  const {
    transactionType,
    amount,
    status,
    description,
    relatedContentId,
    relatedAddress,
    category
  } = req.body;

  const errors = [];

  // Validate transaction type
  const validTypes = [
    'purchase',
    'subscription',
    'refund',
    'payout',
    'transfer',
    'deposit',
    'withdrawal',
    'renewal',
    'upgrade',
    'downgrade',
    'fee',
    'tip',
    'reward'
  ];

  if (!transactionType || !validTypes.includes(transactionType)) {
    errors.push('Invalid or missing transaction type');
  }

  // Validate amount
  if (typeof amount !== 'number' || amount < 0) {
    errors.push('Amount must be a non-negative number');
  }

  if (amount > 1000000) {
    errors.push('Amount exceeds maximum limit');
  }

  // Validate status
  if (status && !['pending', 'confirmed', 'failed', 'cancelled'].includes(status)) {
    errors.push('Invalid transaction status');
  }

  // Validate description
  if (description && typeof description !== 'string') {
    errors.push('Description must be a string');
  }

  if (description && description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Validate category
  if (category && !['income', 'expense', 'internal_transfer', 'fee', 'reward'].includes(category)) {
    errors.push('Invalid category');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate pagination parameters
 */
const validatePaginationParams = (req, res, next) => {
  const { skip = 0, limit = 50, sortBy = 'date-desc' } = req.query;

  const errors = [];

  // Validate skip
  const skipNum = parseInt(skip);
  if (isNaN(skipNum) || skipNum < 0) {
    errors.push('Skip must be a non-negative integer');
  }

  // Validate limit
  const limitNum = parseInt(limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
    errors.push('Limit must be between 1 and 500');
  }

  // Validate sortBy
  const validSortOptions = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
  if (!validSortOptions.includes(sortBy)) {
    errors.push('Invalid sort option');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Pagination validation failed',
      errors
    });
  }

  // Attach validated params to request
  req.validatedPagination = {
    skip: skipNum,
    limit: limitNum,
    sortBy
  };

  next();
};

/**
 * Validate date range parameters
 */
const validateDateRangeParams = (req, res, next) => {
  const { startDate, endDate } = req.query;

  const errors = [];

  // Validate startDate
  if (!startDate) {
    errors.push('Start date is required');
  } else {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    }
  }

  // Validate endDate
  if (!endDate) {
    errors.push('End date is required');
  } else {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    }
  }

  // Validate date range
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      errors.push('Start date must be before end date');
    }

    // Validate date range is not too large (max 1 year)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
      errors.push('Date range cannot exceed 365 days');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Date range validation failed',
      errors
    });
  }

  req.validatedDateRange = {
    startDate: new Date(startDate),
    endDate: new Date(endDate)
  };

  next();
};

/**
 * Validate transaction filter parameters
 */
const validateTransactionFilter = (req, res, next) => {
  const { status, type, category } = req.query;

  const errors = [];

  // Validate status filter
  if (status && !['pending', 'confirmed', 'failed', 'cancelled'].includes(status)) {
    errors.push('Invalid status filter');
  }

  // Validate type filter
  const validTypes = [
    'purchase',
    'subscription',
    'refund',
    'payout',
    'transfer',
    'deposit',
    'withdrawal',
    'renewal',
    'upgrade',
    'downgrade',
    'fee',
    'tip',
    'reward'
  ];

  if (type && !validTypes.includes(type)) {
    errors.push('Invalid transaction type filter');
  }

  // Validate category filter
  if (category && !['income', 'expense', 'internal_transfer', 'fee', 'reward'].includes(category)) {
    errors.push('Invalid category filter');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Filter validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate transaction hash
 */
const validateTransactionHash = (req, res, next) => {
  const { txHash } = req.params;

  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction hash'
    });
  }

  // Basic validation - should be hex string (Stacks tx hashes are 64 hex chars)
  if (!/^[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction hash format'
    });
  }

  next();
};

/**
 * Validate transaction ID (MongoDB ObjectId)
 */
const validateTransactionId = (req, res, next) => {
  const { txId } = req.params;

  // MongoDB ObjectId validation
  if (!txId || !/^[0-9a-fA-F]{24}$/.test(txId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction ID'
    });
  }

  next();
};

/**
 * Validate transaction status update
 */
const validateTransactionStatusUpdate = (req, res, next) => {
  const { status, blockHeight, blockTime, confirmations } = req.body;

  const errors = [];

  // Validate status
  if (!status || !['pending', 'confirmed', 'failed', 'cancelled'].includes(status)) {
    errors.push('Invalid transaction status');
  }

  // Validate blockHeight
  if (blockHeight !== undefined && (typeof blockHeight !== 'number' || blockHeight < 0)) {
    errors.push('Block height must be a non-negative number');
  }

  // Validate confirmations
  if (confirmations !== undefined && (typeof confirmations !== 'number' || confirmations < 0)) {
    errors.push('Confirmations must be a non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Status update validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate export year parameter
 */
const validateExportYear = (req, res, next) => {
  const { year } = req.params;

  const errors = [];

  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear()) {
    errors.push('Invalid year parameter');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Export validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate month parameter
 */
const validateMonth = (req, res, next) => {
  const { month } = req.params;

  const monthNum = parseInt(month);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({
      success: false,
      message: 'Invalid month parameter (must be 1-12)'
    });
  }

  next();
};

/**
 * Validate days parameter for balance history
 */
const validateDaysParam = (req, res, next) => {
  const { days = 30 } = req.query;

  const daysNum = parseInt(days);
  if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
    return res.status(400).json({
      success: false,
      message: 'Days parameter must be between 1 and 365'
    });
  }

  next();
};

module.exports = {
  validateTransactionData,
  validatePaginationParams,
  validateDateRangeParams,
  validateTransactionFilter,
  validateTransactionHash,
  validateTransactionId,
  validateTransactionStatusUpdate,
  validateExportYear,
  validateMonth,
  validateDaysParam
};
