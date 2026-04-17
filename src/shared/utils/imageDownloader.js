'use strict';

const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { env } = require('../../config/env');

/**
 * Image Mirroring Utility
 * Downloads remote images to local storage to bypass regional blocks and improve performance.
 */
async function mirrorImage(url, folder, fileName) {
  if (!url || !url.startsWith('http')) return url;

  const targetDir = path.join(process.cwd(), env.UPLOAD_DIR, 'covers', folder);
  
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (e) {
    // Already exists
  }

  // Determine extension from URL or default to .jpg
  let ext = path.extname(new URL(url).pathname) || '.jpg';
  if (ext.includes('?')) ext = ext.split('?')[0];
  
  const finalFileName = `${fileName}${ext}`;
  const filePath = path.join(targetDir, finalFileName);
  const relativePath = `/uploads/covers/${folder}/${finalFileName}`;

  // If already exists, just return the path
  try {
    await fs.access(filePath);
    return relativePath;
  } catch (e) {
    // Does not exist, continue to download
  }

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': new URL(url).origin
      },
      timeout: 20000 // Increased timeout
    });

    const contentType = response.headers['content-type'];
    if (contentType && !contentType.startsWith('image/')) {
       console.warn(`[Mirror] Success but not an image: ${url} (${contentType})`);
       // Continue anyway, some servers might return wrong content-type but send image data
    }

    const writer = fsSync.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        // Double check file size
        try {
          const stats = fsSync.statSync(filePath);
          if (stats.size < 100) {
            console.warn(`[Mirror] Image too small (<100B): ${url}`);
          }
        } catch (e) {}
        resolve(relativePath);
      });
      writer.on('error', (err) => {
        fs.unlink(filePath).catch(() => {});
        reject(err);
      });
    });
  } catch (err) {
    const status = err.response?.status;
    console.error(`[Mirror] Failed to download ${url} [Status: ${status || 'Err'}]:`, err.message);
    return url; // Fallback to original URL on failure
  }
}

module.exports = { mirrorImage };
