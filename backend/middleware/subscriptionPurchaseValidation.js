const isValidObjectId = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

const validateSubscriptionPurchase = (req, res, next) => {
  const {
    user,
    creator,
    tierId,
    amount,
    transactionId
  } = req.body;

  const errors = [];

  if (!isValidObjectId(user)) {
    errors.push({ field: 'user', message: 'User identifier is required' });
  }

  if (!isValidObjectId(creator)) {
    errors.push({ field: 'creator', message: 'Creator identifier is required' });
  }

  if (tierId === undefined || tierId === null || isNaN(Number(tierId))) {
    errors.push({ field: 'tierId', message: 'Numeric tierId is required' });
  }

  if (amount === undefined || amount === null || Number(amount) <= 0) {
    errors.push({ field: 'amount', message: 'Subscription amount must be a positive number' });
  }

  if (!isValidObjectId(transactionId)) {
    errors.push({ field: 'transactionId', message: 'Transaction ID is required' });
  }

  if (req.body.expiry && Number.isNaN(Date.parse(req.body.expiry))) {
    errors.push({ field: 'expiry', message: 'Expiry must be a valid date' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

module.exports = {
  validateSubscriptionPurchase
};
