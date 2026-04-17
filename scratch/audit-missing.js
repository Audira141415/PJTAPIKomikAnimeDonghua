
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Manga = require('../src/models/Manga');

async function audit() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const total = await Manga.countDocuments();
    console.log(`Total series: ${total}`);

    const missingTitle = await Manga.countDocuments({ 
      $or: [
        { title: { $exists: false } },
        { title: '' },
        { title: 'Unknown' }
      ]
    });
    console.log(`Missing/Unknown titles: ${missingTitle}`);

    const missingCover = await Manga.countDocuments({
      $or: [
        { coverImage: { $exists: false } },
        { coverImage: null },
        { coverImage: '' }
      ]
    });
    console.log(`Missing covers: ${missingCover}`);

    const externalCovers = await Manga.countDocuments({
      coverImage: /^http/
    });
    console.log(`External covers (not mirrored): ${externalCovers}`);

    const brokenRefs = await Manga.find({ 
      $or: [
        { title: 'Unknown' },
        { coverImage: '' },
        { coverImage: null }
      ]
    }).limit(10);

    if (brokenRefs.length > 0) {
      console.log('\nSample broken records:');
      brokenRefs.forEach(m => {
        console.log(`- ID: ${m._id}, Slug: ${m.slug}, Title: "${m.title}", Source: ${m.sourceKey}, InternalRef: ${m.sourceId}`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Audit failed:', err.message);
  }
}

audit();
