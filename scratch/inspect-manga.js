const mongoose = require('mongoose');
const Manga = require('./src/models/Manga');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://admin:change_me@mongo:27017/comic_platform?authSource=admin');
  const m = await Manga.findOne({ coverImage: { $exists: true } });
  if (m) {
    console.log('--- FOUND ---');
    console.log(`Title: ${m.title}`);
    console.log(`Type: ${m.type}`);
    console.log(`Cover: ${m.coverImage}`);
  } else {
    console.log('--- NOT FOUND ---');
  }
  process.exit(0);
}

check();
