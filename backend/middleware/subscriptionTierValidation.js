// Subscription Tier Validation Middleware
// Validates subscription tier creation and update requests

const validateTierCreation = (req, res, next) => {
  const { creatorId, name, description, price, benefits } = req.body;

  // Validate required fields
  if (!creatorId) {
    return res.status(400).json({
      success: false,
      message: 'Creator ID is required'
    });
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tier name is required and must be a non-empty string'
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Tier name must not exceed 100 characters'
    });
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tier description is required and must be a non-empty string'
    });
  }

  if (description.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Tier description must not exceed 500 characters'
    });
  }

  if (price === undefined || price === null) {
    return res.status(400).json({
      success: false,
      message: 'Price is required'
    });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({
      success: false,
      message: 'Price must be a non-negative number'
    });
  }

  if (price > 9999999) {
    return res.status(400).json({
      success: false,
      message: 'Price exceeds maximum allowed value'
    });
  }

  // Validate benefits if provided
  if (benefits !== undefined) {
    if (!Array.isArray(benefits)) {
      return res.status(400).json({
        success: false,
        message: 'Benefits must be an array'
      });
    }

    for (const benefit of benefits) {
      if (!benefit.feature || typeof benefit.feature !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Each benefit must have a feature name (string)'
        });
      }

      if (benefit.feature.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Benefit feature name must not exceed 200 characters'
        });
      }

      if (benefit.description && typeof benefit.description !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Benefit description must be a string'
        });
      }

      if (benefit.description && benefit.description.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Benefit description must not exceed 300 characters'
        });
      }
    }
  }

  next();
};

const validateTierUpdate = (req, res, next) => {
  const updateData = req.body;
  const allowedFields = [
    'name',
    'description',
    'price',
    'benefits',
    'icon',
    'position',
    'isPopular',
    'isActive',
    'isVisible',
    'visibility',
    'trialDays',
    'currency',
    'billingCycle',
    'accessLevel',
    'maxSubscribers',
    'allowDowngrade',
    'allowUpgrade',
    'upgradeDiscount'
  ];

  // Check for invalid fields
  const invalidFields = Object.keys(updateData).filter(
    field => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid fields: ${invalidFields.join(', ')}`
    });
  }

  // Validate specific fields if present
  if (updateData.name !== undefined) {
    if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tier name must be a non-empty string'
      });
    }

    if (updateData.name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tier name must not exceed 100 characters'
      });
    }
  }

  if (updateData.description !== undefined) {
    if (typeof updateData.description !== 'string' || updateData.description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tier description must be a non-empty string'
      });
    }

    if (updateData.description.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Tier description must not exceed 500 characters'
      });
    }
  }

  if (updateData.price !== undefined) {
    if (typeof updateData.price !== 'number' || updateData.price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a non-negative number'
      });
    }

    if (updateData.price > 9999999) {
      return res.status(400).json({
        success: false,
        message: 'Price exceeds maximum allowed value'
      });
    }
  }

  if (updateData.trialDays !== undefined) {
    if (typeof updateData.trialDays !== 'number' || updateData.trialDays < 0 || updateData.trialDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Trial days must be a number between 0 and 365'
      });
    }
  }

  if (updateData.visibility !== undefined) {
    if (!['public', 'private', 'hidden'].includes(updateData.visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Visibility must be one of: public, private, hidden'
      });
    }
  }

  if (updateData.currency !== undefined) {
    if (!['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(updateData.currency)) {
      return res.status(400).json({
        success: false,
        message: 'Currency must be one of: USD, EUR, GBP, CAD, AUD'
      });
    }
  }

  if (updateData.billingCycle !== undefined) {
    if (!['monthly', 'quarterly', 'annual'].includes(updateData.billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Billing cycle must be one of: monthly, quarterly, annual'
      });
    }
  }

  if (updateData.maxSubscribers !== undefined) {
    if (updateData.maxSubscribers !== null && (typeof updateData.maxSubscribers !== 'number' || updateData.maxSubscribers < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Max subscribers must be null or a positive number'
      });
    }
  }

  if (updateData.upgradeDiscount !== undefined) {
    if (typeof updateData.upgradeDiscount !== 'number' || updateData.upgradeDiscount < 0 || updateData.upgradeDiscount > 100) {
      return res.status(400).json({
        success: false,
        message: 'Upgrade discount must be a number between 0 and 100'
      });
    }
  }

  // Validate benefits if provided
  if (updateData.benefits !== undefined) {
    if (!Array.isArray(updateData.benefits)) {
      return res.status(400).json({
        success: false,
        message: 'Benefits must be an array'
      });
    }

    for (const benefit of updateData.benefits) {
      if (!benefit.feature || typeof benefit.feature !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Each benefit must have a feature name (string)'
        });
      }

      if (benefit.feature.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Benefit feature name must not exceed 200 characters'
        });
      }
    }
  }

  next();
};

const validateTierId = (req, res, next) => {
  const { tierId } = req.params;

  if (!tierId) {
    return res.status(400).json({
      success: false,
      message: 'Tier ID is required'
    });
  }

  if (!/^[0-9a-fA-F]{24}$/.test(tierId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid tier ID format'
    });
  }

  next();
};

const validateCreatorId = (req, res, next) => {
  const { creatorId } = req.params || req.body;

  if (!creatorId) {
    return res.status(400).json({
      success: false,
      message: 'Creator ID is required'
    });
  }

  if (!/^[0-9a-fA-F]{24}$/.test(creatorId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid creator ID format'
    });
  }

  next();
};

const validateBulkTierCreation = (req, res, next) => {
  const { tiers } = req.body;

  if (!tiers || !Array.isArray(tiers)) {
    return res.status(400).json({
      success: false,
      message: 'Tiers array is required'
    });
  }

  if (tiers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tiers array must not be empty'
    });
  }

  if (tiers.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Cannot create more than 50 tiers at once'
    });
  }

  // Validate each tier
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];

    if (!tier.name || typeof tier.name !== 'string' || tier.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: `Tier ${i + 1}: name is required and must be a non-empty string`
      });
    }

    if (tier.name.length > 100) {
      return res.status(400).json({
        success: false,
        message: `Tier ${i + 1}: name must not exceed 100 characters`
      });
    }

    if (!tier.description || typeof tier.description !== 'string' || tier.description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: `Tier ${i + 1}: description is required and must be a non-empty string`
      });
    }

    if (tier.description.length > 500) {
      return res.status(400).json({
        success: false,
        message: `Tier ${i + 1}: description must not exceed 500 characters`
      });
    }

    if (tier.price === undefined || tier.price === null) {
      return res.status(400).json({
        success: false,
        message: `Tier ${i + 1}: price is required`
      });
    }

    if (typeof tier.price !== 'number' || tier.price < 0) {
      return res.status(400).json({
        success: false,
        message: `Tier ${i + 1}: price must be a non-negative number`
      });
    }

    if (tier.price > 9999999) {
      return res.status(400).json({
        success: false,
        message: `Tier ${i + 1}: price exceeds maximum allowed value`
      });
    }

    // Validate optional fields
    if (tier.trialDays !== undefined) {
      if (typeof tier.trialDays !== 'number' || tier.trialDays < 0 || tier.trialDays > 365) {
        return res.status(400).json({
          success: false,
          message: `Tier ${i + 1}: trial days must be a number between 0 and 365`
        });
      }
    }

    if (tier.visibility !== undefined) {
      if (!['public', 'private', 'hidden'].includes(tier.visibility)) {
        return res.status(400).json({
          success: false,
          message: `Tier ${i + 1}: visibility must be one of: public, private, hidden`
        });
      }
    }

    if (tier.currency !== undefined) {
      if (!['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(tier.currency)) {
        return res.status(400).json({
          success: false,
          message: `Tier ${i + 1}: currency must be one of: USD, EUR, GBP, CAD, AUD`
        });
      }
    }

    if (tier.billingCycle !== undefined) {
      if (!['monthly', 'quarterly', 'annual'].includes(tier.billingCycle)) {
        return res.status(400).json({
          success: false,
          message: `Tier ${i + 1}: billing cycle must be one of: monthly, quarterly, annual`
        });
      }
    }

    if (tier.maxSubscribers !== undefined) {
      if (tier.maxSubscribers !== null && (typeof tier.maxSubscribers !== 'number' || tier.maxSubscribers < 1)) {
        return res.status(400).json({
          success: false,
          message: `Tier ${i + 1}: max subscribers must be null or a positive number`
        });
      }
    }

    if (tier.upgradeDiscount !== undefined) {
      if (typeof tier.upgradeDiscount !== 'number' || tier.upgradeDiscount < 0 || tier.upgradeDiscount > 100) {
        return res.status(400).json({
          success: false,
          message: `Tier ${i + 1}: upgrade discount must be a number between 0 and 100`
        });
      }
    }

    // Validate benefits if provided
    if (tier.benefits !== undefined) {
      if (!Array.isArray(tier.benefits)) {
        return res.status(400).json({
          success: false,
          message: `Tier ${i + 1}: benefits must be an array`
        });
      }

      for (const benefit of tier.benefits) {
        if (!benefit.feature || typeof benefit.feature !== 'string') {
          return res.status(400).json({
            success: false,
            message: `Tier ${i + 1}: each benefit must have a feature name (string)`
          });
        }

        if (benefit.feature.length > 200) {
          return res.status(400).json({
            success: false,
            message: `Tier ${i + 1}: benefit feature name must not exceed 200 characters`
          });
        }
      }
    }
  }

  next();
};

const validateBulkTierUpdate = (req, res, next) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({
      success: false,
      message: 'Updates array is required'
    });
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Updates array must not be empty'
    });
  }

  if (updates.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Cannot update more than 50 tiers at once'
    });
  }

  // Validate each update
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];

    if (!update.tierId) {
      return res.status(400).json({
        success: false,
        message: `Update ${i + 1}: tierId is required`
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(update.tierId)) {
      return res.status(400).json({
        success: false,
        message: `Update ${i + 1}: invalid tier ID format`
      });
    }

    if (!update.updateData || typeof update.updateData !== 'object') {
      return res.status(400).json({
        success: false,
        message: `Update ${i + 1}: updateData object is required`
      });
    }

    const updateData = update.updateData;

    // Validate updateData fields (similar to validateTierUpdate)
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: `Update ${i + 1}: name must be a non-empty string`
        });
      }

      if (updateData.name.length > 100) {
        return res.status(400).json({
          success: false,
          message: `Update ${i + 1}: name must not exceed 100 characters`
        });
      }
    }

    if (updateData.description !== undefined) {
      if (typeof updateData.description !== 'string' || updateData.description.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: `Update ${i + 1}: description must be a non-empty string`
        });
      }

      if (updateData.description.length > 500) {
        return res.status(400).json({
          success: false,
          message: `Update ${i + 1}: description must not exceed 500 characters`
        });
      }
    }

    if (updateData.price !== undefined) {
      if (typeof updateData.price !== 'number' || updateData.price < 0) {
        return res.status(400).json({
          success: false,
          message: `Update ${i + 1}: price must be a non-negative number`
        });
      }

      if (updateData.price > 9999999) {
        return res.status(400).json({
          success: false,
          message: `Update ${i + 1}: price exceeds maximum allowed value`
        });
      }
    }

    // Add other validations as needed...
  }

  next();
};

module.exports = {
  validateTierCreation,
  validateTierUpdate,
  validateTierId,
  validateCreatorId,
  validateBulkTierCreation,
  validateBulkTierUpdate
};
