const mongoose = require('mongoose');
const Manga = require('./src/models/Manga');
const Chapter = require('./src/models/Chapter');
const Episode = require('./src/models/Episode');

async function stats() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Comic & Chapter Stats
    const comicsTotal = await Manga.countDocuments({ contentCategory: 'comic' });
    const chaptersTotal = await Manga.db.collection('chapters').countDocuments();
    
    // Find how many comics have at least 1 chapter
    const comicsWithChapters = (await Chapter.distinct('manga')).length;

    // Animation & Episode Stats
    const animationTotal = await Manga.countDocuments({ contentCategory: 'animation' });
    const episodesTotal = await Manga.db.collection('episodes').countDocuments();
    
    // Find how many animations have at least 1 episode
    const animationsWithEpisodes = (await Episode.distinct('series')).length;

    console.log('--- CONTENT AVAILABILITY STATS ---');
    console.log('COMICS (Manga/Manhwa/Manhua):');
    console.log(`  - Total Series: ${comicsTotal}`);
    console.log(`  - Series with Chapters: ${comicsWithChapters} (${((comicsWithChapters/comicsTotal)*100 || 0).toFixed(2)}%)`);
    console.log(`  - Total Chapters in DB: ${chaptersTotal}`);
    
    console.log('\nANIMATION (Anime/Donghua):');
    console.log(`  - Total Series: ${animationTotal}`);
    console.log(`  - Series with Episodes: ${animationsWithEpisodes} (${((animationsWithEpisodes/animationTotal)*100 || 0).toFixed(2)}%)`);
    console.log(`  - Total Episodes in DB: ${episodesTotal}`);

    console.log('\nDATA INTEGRITY:');
    const chaptersEmpty = await Chapter.countDocuments({ images: { $size: 0 } });
    console.log(`  - Chapters without images: ${chaptersEmpty}`);
    
    const episodesEmpty = await Episode.countDocuments({ streamUrls: { $size: 0 } });
    console.log(`  - Episodes without stream URLs: ${episodesEmpty}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

stats();
