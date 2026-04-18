'use strict';

const {              Manga              } = require('@models');
const catchAsync = require('@core/utils/catchAsync');
const { env } = require('@core/config/env');

const generateSitemap = catchAsync(async (req, res) => {
  // Base URL for links (frontend URL)
  const baseUrl = (env.CORS_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
  
  // Fetch series - we only want title and slug for sitemap
  // Limit to 45,000 to stay under the 50,000 limit for a single sitemap file
  const mangas = await Manga.find(
    { status: { $ne: 'deleted' } }, 
    'slug type updatedAt'
  ).limit(45000).sort({ updatedAt: -1 }).lean();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  const staticPages = ['', '/search', '/popular', '/trending', '/latest'];
  staticPages.forEach(path => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${path}</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += '  </url>\n';
  });

  // Dynamic series pages
  mangas.forEach(manga => {
    // Determine path based on type
    let prefix = '/manga';
    if (manga.type === 'anime' || manga.type === 'donghua' || manga.type === 'movie' || manga.type === 'ona') {
      prefix = '/anime';
    } else if (manga.type === 'manhwa') {
      prefix = '/manhwa';
    } else if (manga.type === 'manhua') {
      prefix = '/manhua';
    }

    const lastMod = manga.updatedAt ? manga.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${prefix}/${manga.slug}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

module.exports = {
  generateSitemap,
};
