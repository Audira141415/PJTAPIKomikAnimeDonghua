'use strict';

const axios = require('axios');
const os = require('os');
const { env } = require('@core/config/env');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Enhanced Telegram Utility for Audira API
 * Supports HTML formatting and system metadata
 */
const telegram = {
  /**
   * Send a formatted message to the admin group
   */
  async sendMessage(text, parseMode = 'HTML') {
    if (!BOT_TOKEN || !CHAT_ID) return;

    try {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      });
    } catch (err) {
      console.error('[Telegram] Failed to send message:', err.message);
    }
  },

  /**
   * Send a professional alert with icons and system stats
   */
  async sendAlert(title, message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '🚨',
      critical: '🔥',
      sync: '🔄'
    };

    const icon = icons[type] || '🔔';
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const freeMem = Math.round(os.freemem() / 1024 / 1024);
    const totalMem = Math.round(os.totalmem() / 1024 / 1024);

    const formattedMessage = [
      `${icon} <b>${title.toUpperCase()}</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `${message}`,
      `━━━━━━━━━━━━━━━━━━`,
      `🕒 <b>Time:</b> <code>${timestamp}</code>`,
      `🖥️ <b>Server:</b> <code>${os.hostname()}</code>`,
      `📊 <b>RAM:</b> <code>${freeMem}/${totalMem} MB Free</code>`,
      `☁️ <b>Env:</b> <code>${process.env.NODE_ENV}</code>`
    ].join('\n');

    return this.sendMessage(formattedMessage);
  },

  /**
   * Specifically for reporting sync results
   */
  async sendSyncReport(source, results) {
    const message = [
      `🌐 <b>Source:</b> <code>${source}</code>`,
      `✨ <b>New Items:</b> <code>${results.inserted || 0}</code>`,
      `🔄 <b>Updated:</b> <code>${results.updated || 0}</code>`,
      `❌ <b>Failed:</b> <code>${results.failed || 0}</code>`,
      results.error ? `\n❗ <b>Error:</b> <i>${results.error}</i>` : ''
    ].join('\n');

    return this.sendAlert(`Sync Report: ${source}`, message, 'sync');
  }
};

module.exports = telegram;
