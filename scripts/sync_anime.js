'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../src/config/logger');
const { Manga } = require('../src/models');
const axios = require('axios');

async function syncAnime() {
  logger.info('Starting manual Anime sync...');

  // Use the same env vars as the main app
  const mongoUri = process.env.MONGO_URI || 'mongodb://admin:change_me@mongo:27017/comic_platform?authSource=admin';
  const apiBase = process.env.SCRAPER_API_BASE_URL || 'http://localhost:5000/api/v1';
  
  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // 1. Fetch from scraper
    // We'll pull a few popular ones to seed the DB
    const searchQuery = 'Solo Leveling'; 
    const scraperUrl = `${apiBase}/scraper/search?q=${encodeURIComponent(searchQuery)}&type=anime`;
    
    logger.info(`Fetching anime data from: ${scraperUrl}`);
    const res = await axios.get(scraperUrl);
    const items = res.data.data || [];

    logger.info(`Found ${items.length} anime items from scraper`);

    if (items.length === 0) {
        logger.warn('No items found from scraper search. Trying fallback trending...');
        const trendingUrl = `${apiBase}/scraper/trending?type=anime`;
        const tRes = await axios.get(trendingUrl);
        const tItems = tRes.data.data || [];
        items.push(...tItems);
    }

    for (const item of items) {
      const slug = item.session || item.id;
      const title = item.title;
      if (!title) continue;

      // Update or create
      await Manga.findOneAndUpdate(
        { $or: [{ slug: slug }, { title: title }] },
        {
          title: title,
          slug: slug,
          contentCategory: 'anime',
          type: item.type || 'TV',
          status: item.status || 'Ongoing',
          description: item.description || item.synopsis || 'Synced from scraper',
          coverImage: item.poster || item.coverImage || '',
          rating: item.score || 8.5,
          views: Math.floor(Math.random() * 10000),
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
      logger.info(`Synced Anime: ${title}`);
    }

    // Verify
    const count = await Manga.countDocuments({ contentCategory: 'anime' });
    logger.info(`Verification: Total Anime in DB now: ${count}`);

    logger.info('Anime seeding completed successfully');
  } catch (err) {
    logger.error('Sync failed:', err);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

syncAnime();
