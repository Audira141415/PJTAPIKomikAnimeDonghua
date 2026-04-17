'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Manga = require('../src/models/Manga');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const docs = await Manga.find({ coverImage: /^http/ }, 'coverImage').limit(500).lean();
  
  const domains = {};
  for (const doc of docs) {
    try {
      const { hostname } = new URL(doc.coverImage);
      domains[hostname] = (domains[hostname] || 0) + 1;
    } catch {}
  }

  const sorted = Object.entries(domains).sort((a, b) => b[1] - a[1]);
  console.log('=== TOP IMAGE DOMAINS ===');
  for (const [domain, count] of sorted) {
    console.log(`${count.toString().padStart(5)} | ${domain}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
