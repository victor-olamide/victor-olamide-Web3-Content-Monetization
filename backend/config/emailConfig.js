const emailConfig = {
  enabled: process.env.EMAIL_ENABLED === 'true',
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  defaultFrom: process.env.EMAIL_DEFAULT_FROM || 'no-reply@yourdomain.com',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  templates: {
    purchase: {
      subject: 'Your purchase is complete',
      body: (ctx) => `Hello ${ctx.userName || 'User'},\n\nThank you for your purchase of ${ctx.itemName}. Your transaction ID: ${ctx.transactionId}.\n\nRegards,\nThe Team`
    },
    subscription: {
      subject: 'Subscription activated',
      body: (ctx) => `Hello ${ctx.userName || 'User'},\n\nYour subscription to ${ctx.planName} is now active. Subscription ID: ${ctx.subscriptionId}.\n\nRegards,\nThe Team`
    }
  }
};

function validateEmailConfig() {
  const errors = [];
  if (emailConfig.enabled) {
    if (emailConfig.provider === 'smtp') {
      const smtp = emailConfig.smtp;
      if (!smtp.host) errors.push('SMTP host is required');
      if (!smtp.port) errors.push('SMTP port is required');
      if (!smtp.auth || !smtp.auth.user || !smtp.auth.pass) errors.push('SMTP auth credentials are required');
    }
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { emailConfig, validateEmailConfig };
