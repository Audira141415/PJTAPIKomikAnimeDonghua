'use strict';

/**
 * Playwright HTTP helper — untuk situs yang dilindungi Cloudflare JS Challenge.
 *
 * Dipakai khusus oleh samehadaku.scraper.js karena v2.samehadaku.how
 * mengembalikan "Just a moment..." challenge page ke HTTP client biasa.
 *
 * Strategy:
 * - Satu browser instance di-reuse selama proses hidup (performance)
 * - CF challenge disolve otomatis oleh Chromium (karena bisa execute JS)
 * - Setelah halaman selesai load, ambil innerHTML dan kembalikan sebagai string
 *
 * ⚠  Launching browser pertama kali lebih lambat (~2s). Selanjutnya cepat.
 */

const { chromium } = require('playwright');

let _browser = null;
let _context = null;
let _closeTimer = null;
let _hooksRegistered = false;
let _activeRequests = 0;
let _initPromise = null;
const IDLE_CLOSE_MS = 5_000;
const DISABLE_BROWSER_SANDBOX = process.env.SCRAPER_DISABLE_BROWSER_SANDBOX === 'true';

function buildLaunchArgs() {
  if (!DISABLE_BROWSER_SANDBOX) {
    return ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'];
  }

  return [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
  ];
}

function scheduleAutoClose() {
  if (_activeRequests > 0) {
    return;
  }
  if (_closeTimer) {
    clearTimeout(_closeTimer);
  }
  _closeTimer = setTimeout(() => {
    closeBrowser().catch(() => {});
  }, IDLE_CLOSE_MS);
}

function registerProcessHooks() {
  if (_hooksRegistered) {
    return;
  }

  const safeClose = () => {
    closeBrowser().catch(() => {});
  };

  process.once('SIGINT', safeClose);
  process.once('SIGTERM', safeClose);
  process.once('beforeExit', safeClose);
  _hooksRegistered = true;
}

async function getBrowser() {
  if (_browser && _browser.isConnected() && _context) {
    return { browser: _browser, context: _context };
  }

  if (!_initPromise) {
    _initPromise = (async () => {
      registerProcessHooks();
      _browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        args: buildLaunchArgs(),
      });
      _context = await _browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport  : { width: 1280, height: 800 },
        locale    : 'id-ID',
        extraHTTPHeaders: {
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
    })().finally(() => {
      _initPromise = null;
    });
  }

  await _initPromise;
  return { browser: _browser, context: _context };
}

/**
 * Fetch HTML dari URL dengan Playwright Chromium.
 * Otomatis menunggu CF challenge selesai (waitUntil: 'domcontentloaded').
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.timeout]   - milidetik, default 30000
 * @returns {Promise<string>}       - HTML string
 */
async function playwrightGet(url, { timeout = 30_000 } = {}) {
  _activeRequests += 1;
  if (_closeTimer) {
    clearTimeout(_closeTimer);
    _closeTimer = null;
  }

  const { context } = await getBrowser();
  const page = await context.newPage();
  try {
    const deadline = Date.now() + timeout;

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    // CF challenge biasanya selesai dalam <10 detik.
    // Kita tunggu sampai title BUKAN "Just a moment..."
    while (Date.now() < deadline) {
      const title = await page.title().catch(() => '');
      if (!title.includes('Just a moment') && !title.includes('Cloudflare')) break;

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await page.waitForTimeout(Math.min(1_000, remaining));
    }

    // Tunggu sampai DOM benar-benar stable
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const finalTitle = await page.title().catch(() => '');
    if (finalTitle.includes('Just a moment') || finalTitle.includes('Cloudflare')) {
      throw new Error(`Cloudflare challenge was not cleared for ${url}`);
    }

    return await page.content();
  } finally {
    await page.close().catch(() => {});
    _activeRequests = Math.max(0, _activeRequests - 1);
    scheduleAutoClose();
  }
}

/**
 * Tutup browser — panggil saat aplikasi shutdown (optional).
 */
async function closeBrowser() {
  if (_closeTimer) {
    clearTimeout(_closeTimer);
    _closeTimer = null;
  }
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
    _context = null;
    _initPromise = null;
  }
}

module.exports = { playwrightGet, closeBrowser };
