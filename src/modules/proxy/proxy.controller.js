'use strict';

const axios = require('axios');
const { logger } = require('../../config/logger');

/**
 * Image Proxy Controller
 * Fetches an image from a remote URL and pipes it to the response.
 * Used to bypass regional blocks (like Internet Positif) since the server
 * uses DNS-over-HTTPS.
 */
exports.proxyImage = async (req, res) => {
  let { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, message: 'Image URL is required' });
  }

  try {
    // Check if the URL is Base64 encoded (obfuscated to bypass filters)
    if (!url.startsWith('http')) {
      try {
        const decoded = Buffer.from(url, 'base64').toString('utf-8');
        if (decoded.startsWith('http')) {
           url = decoded;
        }
      } catch (e) {
        // Not base64 or invalid, proceed with original
      }
    }

    // Basic validation
    if (!url.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'Invalid image URL' });
    }

    // Set common headers for scraping
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': new URL(url).origin,
    };

    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: headers,
      timeout: 10000,
    });

    // Pass significant headers from the source to our response
    const contentType = response.headers['content-type'];
    const contentLength = response.headers['content-length'];
    const cacheControl = response.headers['cache-control'] || 'public, max-age=86400'; // Default 1 day cache

    if (contentType) res.setHeader('Content-Type', contentType);
    // Remove Content-Length to avoid ERR_CONTENT_LENGTH_MISMATCH if upstream differs
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin for images

    // Pipe the response stream directly to the client
    response.data.pipe(res);

    // Handle stream errors
    response.data.on('error', (err) => {
      console.error(`[Proxy] Stream error for ${url}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: 'Source stream failed' });
      }
    });

  } catch (err) {
    const status = err.response ? err.response.status : 500;
    const message = err.response ? `Source returned ${status}` : err.message;

    console.error(`[Proxy] Failed to fetch image ${url}:`, message);
    
    // Return a generic placeholder or a 404 if the source failed
    if (!res.headersSent) {
      res.status(status === 404 ? 404 : 502).json({ 
        success: false, 
        message: 'Could not proxy image',
        error: message 
      });
    }
  }
};
