const nodemailer = require('nodemailer');
const { emailConfig } = require('../config/emailConfig');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!emailConfig.enabled) {
    transporter = {
      sendMail: async (mail) => {
        // In disabled mode, log and resolve
        console.log('Email disabled - would send:', mail);
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

module.exports = { sendEmail, getTransporter };
