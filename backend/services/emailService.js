const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const { emailConfig, getEmailLayout } = require('../config/emailConfig');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!emailConfig.enabled) {
    transporter = {
      sendMail: async (mail) => {
        // In disabled mode, log and resolve
        logger.info('Email disabled - would send:', mail);
        return Promise.resolve({ simulated: true, mail });
      }
    };
    return transporter;
  }

  if (emailConfig.provider === 'smtp') {
    transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: !!emailConfig.smtp.secure,
      auth: emailConfig.smtp.auth
    });
  } else {
    throw new Error(`Unsupported email provider: ${emailConfig.provider}`);
  }

  return transporter;
}

async function sendEmail({ to, from, subject, text, html }) {
  const t = getTransporter();
  const mail = {
    from: from || emailConfig.defaultFrom,
    to,
    subject,
    text,
    html
  };

  return await t.sendMail(mail);
}

/**
 * Send registration welcome email
 * @param {string} email - User email address
 * @param {Object} userData - User data (userName, accountUrl)
 * @returns {Promise<Object>} Email send result
 */
async function sendRegistrationEmail(email, userData = {}) {
  if (!email) {
    throw new Error('Email address is required');
  }

  const template = emailConfig.templates.registration;
  const text = template.text({ userName: userData.userName || 'User' });
  const html = template.html({ userName: userData.userName || 'User' });

  try {
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      text,
      html
    });
    logger.info(`Registration email sent to ${email}`);
    return { success: true, result, email };
  } catch (error) {
    logger.error(`Error sending registration email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send subscription confirmation email
 * @param {string} email - User email address
 * @param {Object} subscriptionData - Subscription data (planName, subscriptionId, amount, currency, startDate, renewalDate)
 * @returns {Promise<Object>} Email send result
 */
async function sendSubscriptionConfirmationEmail(email, subscriptionData = {}) {
  if (!email) {
    throw new Error('Email address is required');
  }
  if (!subscriptionData.planName) {
    throw new Error('Plan name is required in subscription data');
  }
  if (!subscriptionData.subscriptionId) {
    throw new Error('Subscription ID is required in subscription data');
  }

  const template = emailConfig.templates.subscriptionConfirmation;
  const context = {
    userName: subscriptionData.userName || 'User',
    planName: subscriptionData.planName,
    subscriptionId: subscriptionData.subscriptionId,
    amount: subscriptionData.amount || 'N/A',
    currency: subscriptionData.currency || 'STX',
    startDate: subscriptionData.startDate,
    renewalDate: subscriptionData.renewalDate
  };

  const text = template.text(context);
  const html = template.html(context);

  try {
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      text,
      html
    });
    logger.info(`Subscription confirmation email sent to ${email} for subscription ${subscriptionData.subscriptionId}`);
    return { success: true, result, email };
  } catch (error) {
    logger.error(`Error sending subscription confirmation email to ${email}:`, error);
    throw error;
  }
}

module.exports = { sendEmail, getTransporter, sendRegistrationEmail, sendSubscriptionConfirmationEmail };
