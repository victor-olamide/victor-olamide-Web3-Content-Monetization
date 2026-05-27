// Helper function to generate HTML email layout
function getEmailLayout(title, content) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: #667eea; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; color: #333; line-height: 1.6; }
          .content h2 { color: #667eea; margin-top: 0; }
          .cta-button { display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
          .highlight { background-color: #f0f0f0; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; 2024 Your Content Monetization Platform. All rights reserved.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

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
    registration: {
      subject: 'Welcome to Your Content Monetization Platform',
      text: (ctx) => `Hello ${ctx.userName || 'User'},\n\nWelcome to the platform! Your account has been successfully created and is ready to use.\n\nYou can now start exploring content, making purchases, and subscribing to creators.\n\nIf you have any questions, please don't hesitate to contact our support team.\n\nBest regards,\nThe Platform Team`,
      html: (ctx) => getEmailLayout('Welcome!', `
        <h2>Welcome to Our Platform, ${ctx.userName || 'User'}!</h2>
        <p>Your account has been successfully created and is ready to use.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse and discover amazing content</li>
          <li>Make purchases and access exclusive content</li>
          <li>Subscribe to your favorite creators</li>
          <li>Manage your account preferences</li>
        </ul>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Happy exploring!</p>
      `)
    },
    subscriptionConfirmation: {
      subject: 'Subscription Activated - Your Account is Ready',
      text: (ctx) => `Hello ${ctx.userName || 'User'},\n\nYour subscription to ${ctx.planName} has been successfully activated!\n\nSubscription ID: ${ctx.subscriptionId}\nAmount: ${ctx.amount} ${ctx.currency || 'STX'}\nStart Date: ${ctx.startDate || new Date().toISOString().split('T')[0]}\nNext Renewal: ${ctx.renewalDate || ''}\n\nYou now have access to all premium content and features.\n\nBest regards,\nThe Platform Team`,
      html: (ctx) => getEmailLayout('Subscription Activated!', `
        <h2>Your Subscription is Now Active!</h2>
        <p>Thank you for subscribing to <strong>${ctx.planName}</strong>. Your subscription has been successfully activated.</p>
        <div class="highlight">
          <p><strong>Subscription Details:</strong></p>
          <ul>
            <li>Plan: ${ctx.planName}</li>
            <li>Amount: ${ctx.amount} ${ctx.currency || 'STX'}</li>
            <li>Subscription ID: ${ctx.subscriptionId}</li>
            <li>Start Date: ${ctx.startDate || new Date().toISOString().split('T')[0]}</li>
            <li>Next Renewal: ${ctx.renewalDate || 'To be determined'}</li>
          </ul>
        </div>
        <p>You now have full access to all premium content and features included in your subscription tier.</p>
        <p>If you have any questions about your subscription, please reach out to our support team.</p>
      `)
    },
    subscription: {
      subject: 'Subscription Activated - Your Account is Ready',
      text: (ctx) => `Hello ${ctx.userName || 'User'},\n\nYour subscription to ${ctx.planName} has been successfully activated!\n\nSubscription ID: ${ctx.subscriptionId}\nAmount: ${ctx.amount} ${ctx.currency || 'STX'}\nStart Date: ${ctx.startDate || new Date().toISOString().split('T')[0]}\nNext Renewal: ${ctx.renewalDate || ''}\n\nYou now have access to all premium content and features.\n\nBest regards,\nThe Platform Team`,
      html: (ctx) => getEmailLayout('Subscription Activated!', `
        <h2>Your Subscription is Now Active!</h2>
        <p>Thank you for subscribing to <strong>${ctx.planName}</strong>. Your subscription has been successfully activated.</p>
        <div class="highlight">
          <p><strong>Subscription Details:</strong></p>
          <ul>
            <li>Plan: ${ctx.planName}</li>
            <li>Amount: ${ctx.amount} ${ctx.currency || 'STX'}</li>
            <li>Subscription ID: ${ctx.subscriptionId}</li>
            <li>Start Date: ${ctx.startDate || new Date().toISOString().split('T')[0]}</li>
            <li>Next Renewal: ${ctx.renewalDate || 'To be determined'}</li>
          </ul>
        </div>
        <p>You now have full access to all premium content and features included in your subscription tier.</p>
        <p>If you have any questions about your subscription, please reach out to our support team.</p>
      `)
    },
    purchase: {
      subject: 'Your purchase is complete',
      text: (ctx) => `Hello ${ctx.userName || 'User'},\n\nThank you for your purchase of ${ctx.itemName}. Your transaction ID: ${ctx.transactionId}.\n\nRegards,\nThe Team`,
      html: (ctx) => getEmailLayout('Purchase Completed', `
        <h2>Purchase Confirmed</h2>
        <p>Thank you for your purchase of <strong>${ctx.itemName}</strong>.</p>
        <div class="highlight">
          <p><strong>Transaction Details:</strong></p>
          <ul>
            <li>Transaction ID: ${ctx.transactionId}</li>
            <li>Item: ${ctx.itemName}</li>
            <li>Amount: ${ctx.amount || ''} ${ctx.currency || 'STX'}</li>
          </ul>
        </div>
        <p>Your purchase is now available in your library.</p>
      `)
    },
    paymentReceipt: {
      subject: 'Payment Receipt - Transaction Confirmed',
      text: (ctx) => `Hello ${ctx.userName || 'User'},\n\nThank you for your payment! Your transaction has been successfully processed.\n\nTransaction Details:\nTransaction ID: ${ctx.transactionId}\nItem: ${ctx.itemName}\nAmount: ${ctx.amount} ${ctx.currency || 'STX'}\nDate: ${ctx.transactionDate || new Date().toISOString().split('T')[0]}\nPayment Method: ${ctx.paymentMethod || 'Blockchain'}\n\nYou can access your purchase in your library.\n\nBest regards,\nThe Platform Team`,
      html: (ctx) => getEmailLayout('Payment Received', `
        <h2>Payment Confirmed!</h2>
        <p>Thank you for your payment. Your transaction has been successfully processed.</p>
        <div class="highlight">
          <p><strong>Transaction Details:</strong></p>
          <ul>
            <li>Transaction ID: ${ctx.transactionId}</li>
            <li>Item: ${ctx.itemName}</li>
            <li>Amount: ${ctx.amount} ${ctx.currency || 'STX'}</li>
            <li>Date: ${ctx.transactionDate || new Date().toISOString().split('T')[0]}</li>
            <li>Payment Method: ${ctx.paymentMethod || 'Blockchain'}</li>
            <li>Status: <strong style="color: #28a745;">Completed</strong></li>
          </ul>
        </div>
        <p>Your purchase is now available in your library. You can access it anytime.</p>
        <p>If you have any questions about this transaction, please contact our support team.</p>
      `)
    },
    renewalReminder: {
      subject: 'Upcoming Subscription Renewal Reminder',
      text: (ctx) => `Hello ${ctx.userName || 'User'},\n\nThis is a reminder that your subscription to ${ctx.planName} will renew on ${ctx.renewalDate}.\n\nRenewal Details:\nPlan: ${ctx.planName}\nAmount: ${ctx.amount} ${ctx.currency || 'STX'}\n\nTo manage your subscription, payment method, or preferences, visit your account settings.\n\nIf you have any questions, please contact us.\n\nBest regards,\nThe Platform Team`,
      html: (ctx) => getEmailLayout('Subscription Renewal Reminder', `
        <h2>Your Subscription Renews Soon</h2>
        <p>This is a friendly reminder that your subscription to <strong>${ctx.planName}</strong> will renew on <strong>${ctx.renewalDate}</strong>.</p>
        <div class="highlight">
          <p><strong>Renewal Details:</strong></p>
          <ul>
            <li>Plan: ${ctx.planName}</li>
            <li>Renewal Amount: ${ctx.amount} ${ctx.currency || 'STX'}</li>
            <li>Renewal Date: ${ctx.renewalDate}</li>
          </ul>
        </div>
        <p>If you need to update your payment method, change your subscription tier, or cancel your subscription, you can manage it in your account settings.</p>
        <p>Thank you for being a valued subscriber!</p>
      `)
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

module.exports = { emailConfig, validateEmailConfig, getEmailLayout };
