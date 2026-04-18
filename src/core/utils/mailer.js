'use strict';

const nodemailer = require('nodemailer');
const { env } = require('@core/config/env');
const logger = require('@core/utils/logger');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!env.SMTP_HOST) {
    // Ethereal / no-op for local dev without SMTP config
    logger.warn('[mailer] SMTP_HOST not configured — emails will not be sent');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
};

/**
 * Send a plain-text + HTML email.
 * Silently swallows errors so the caller flow is never blocked by email issues.
 */
const sendMail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();
  if (!transport) return;

  try {
    await transport.sendMail({
      from: env.SMTP_FROM || `"Audira Comic" <no-reply@audira-comic.app>`,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    logger.error('[mailer] Failed to send email', { to, subject, err: err.message });
  }
};

module.exports = { sendMail };
