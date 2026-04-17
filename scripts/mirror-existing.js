'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { mirrorImage } = require('../src/shared/utils/imageDownloader');
const Manga = require('../src/models/Manga');

const CONCURRENCY = 10; // Download 10 gambar bersamaan
const BATCH_SIZE = 100;

async function processBatch(items) {
  const results = await Promise.allSettled(
    items.map(async (manga) => {
      try {
        const localPath = await mirrorImage(
          manga.coverImage,
          manga.type || 'unknown',
          manga.slug || manga._id.toString()
        );
        if (localPath && localPath.startsWith('/uploads')) {
          await Manga.findByIdAndUpdate(manga._id, { coverImage: localPath });
          return 'success';
        }
        return 'skip';
      } catch (err) {
        return 'fail';
      }
    })
  );

  const success = results.filter(r => r.value === 'success').length;
  const fail = results.filter(r => r.value !== 'success').length;
  return { success, fail };
}

async function run() {
  console.log('--- PARALLEL MIRROR STARTING ---');
  await mongoose.connect(process.env.MONGO_URI);

  const total = await Manga.countDocuments({ coverImage: /^http/ });
  console.log(`[Info] Found ${total} images to mirror.`);

  let processed = 0;
  let totalSuccess = 0;
  let totalFail = 0;
  let skip = 0;

  while (true) {
    const batch = await Manga.find(
      { coverImage: /^http/ },
      'title slug type coverImage'
    ).skip(skip).limit(BATCH_SIZE).lean();

    if (batch.length === 0) break;

    // Split batch into concurrent chunks of CONCURRENCY
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      const { success, fail } = await processBatch(chunk);
      totalSuccess += success;
      totalFail += fail;
      processed += chunk.length;
      process.stdout.write(`\r[Progress] ${processed}/${total} | ✅ ${totalSuccess} | ❌ ${totalFail}`);
    }

    // If batch had less than BATCH_SIZE, we're done
    if (batch.length < BATCH_SIZE) break;
    
    // The skip is tricky since we're updating records – re-query from beginning
    // but only records still with http (they get updated to /uploads)
    // So skip remains 0 and the query naturally shrinks
  }

  console.log('\n--- PARALLEL MIRROR COMPLETE ---');
  console.log(`Total Success: ${totalSuccess}`);
  console.log(`Total Failed : ${totalFail}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('[Fatal]', err);
  process.exit(1);
});
