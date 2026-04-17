const mongoose = require('mongoose');
const Manga = require('./src/models/Manga');

async function stats() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Comic Stats
    const comicsTotal = await Manga.countDocuments({ contentCategory: 'comic' });
    const comicsWithCover = await Manga.countDocuments({ 
      contentCategory: 'comic', 
      coverImage: { $ne: null, $ne: '' } 
    });

    // Animation Stats (Anime/Donghua)
    const animationTotal = await Manga.countDocuments({ contentCategory: 'animation' });
    const animationWithCover = await Manga.countDocuments({ 
      animationType: { $exists: false }, // avoid confusion if there are other flags
      contentCategory: 'animation', 
      coverImage: { $ne: null, $ne: '' } 
    });

    console.log('--- DATABASE COVER STATS ---');
    console.log('COMICS (Manga/Manhwa/Manhua):');
    console.log(`  - Total: ${comicsTotal}`);
    console.log(`  - With Cover: ${comicsWithCover}`);
    console.log(`  - Percent: ${((comicsWithCover/comicsTotal)*100 || 0).toFixed(2)}%`);
    
    console.log('\nANIMATION (Anime/Donghua):');
    console.log(`  - Total: ${animationTotal}`);
    console.log(`  - With Cover: ${animationWithCover}`);
    console.log(`  - Percent: ${((animationWithCover/animationTotal)*100 || 0).toFixed(2)}%`);

    console.log('\nGRAND TOTAL:');
    console.log(`  - Total Records: ${comicsTotal + animationTotal}`);
    console.log(`  - Total With Cover: ${comicsWithCover + animationWithCover}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

stats();
