require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const slugify = require('slugify');
const { env } = require('./src/config/env');

const User = require('./src/models/User');
const Manga = require('./src/models/Manga');
const Chapter = require('./src/models/Chapter');

const genres = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller', 'Isekai', 'Martial Arts',
];

const mangaData = [
  {
    title: 'Shadow Monarch',
    description: 'A weak hunter gains the power to command shadows and rises to become the strongest hunter in the world.',
    type: 'manhwa',
    genres: ['Action', 'Fantasy', 'Adventure'],
    author: 'Chugong',
    artist: 'Jang Sung-rak',
    status: 'completed',
    rating: 9.2,
    views: 150000,
  },
  {
    title: 'Blade of the Immortal Phoenix',
    description: 'A samurai cursed with immortality seeks redemption by slaying a thousand evil men.',
    type: 'manga',
    genres: ['Action', 'Drama', 'Supernatural'],
    author: 'Hiroaki Samura',
    artist: 'Hiroaki Samura',
    status: 'completed',
    rating: 8.5,
    views: 95000,
  },
  {
    title: 'Tales of Demons and Gods',
    description: 'The strongest Demon Spiritist travels back in time to his 13-year-old self.',
    type: 'manhua',
    genres: ['Action', 'Fantasy', 'Martial Arts'],
    author: 'Mad Snail',
    artist: 'Jiang Ruotai',
    status: 'ongoing',
    rating: 8.8,
    views: 200000,
  },
  {
    title: 'Tower of Heaven',
    description: 'Climbers ascend a mysterious tower each floor a new test of strength and wit.',
    type: 'manhwa',
    genres: ['Action', 'Adventure', 'Mystery'],
    author: 'SIU',
    artist: 'SIU',
    status: 'ongoing',
    rating: 9.0,
    views: 180000,
  },
  {
    title: 'One Strike Man',
    description: 'A hero so powerful he can defeat anyone with a single punch now searches for a worthy opponent.',
    type: 'manga',
    genres: ['Action', 'Comedy', 'Supernatural'],
    author: 'ONE',
    artist: 'Yusuke Murata',
    status: 'ongoing',
    rating: 9.1,
    views: 320000,
  },
  {
    title: 'Cultivation Chat Group',
    description: 'A university student accidentally joins a chat group of cultivators.',
    type: 'manhua',
    genres: ['Comedy', 'Fantasy', 'Slice of Life'],
    author: 'Legend of the Sacred Knight',
    artist: 'Unknown',
    status: 'ongoing',
    rating: 7.9,
    views: 65000,
  },
  {
    title: 'Kingdom of Steel',
    description: 'A young slave rises through the ranks of ancient warring states to become a great general.',
    type: 'manga',
    genres: ['Action', 'Drama', 'Adventure'],
    author: 'Yasuhisa Hara',
    artist: 'Yasuhisa Hara',
    status: 'ongoing',
    rating: 9.3,
    views: 250000,
  },
  {
    title: 'The Great Mage Returns',
    description: 'After 4000 years the greatest mage in history reincarnates in a world that has forgotten magic.',
    type: 'manhwa',
    genres: ['Fantasy', 'Action', 'Isekai'],
    author: 'Sun Ainong',
    artist: 'Dowon',
    status: 'ongoing',
    rating: 8.4,
    views: 110000,
  },
  {
    title: 'Spirit Blade Mountain',
    description: 'A genius with zero spiritual roots enters the spirit blade sect.',
    type: 'manhua',
    genres: ['Comedy', 'Fantasy', 'Martial Arts'],
    author: 'Guowang Bixia',
    artist: 'Pig Liver',
    status: 'completed',
    rating: 7.6,
    views: 45000,
  },
  {
    title: 'Crimson Moon Rising',
    description: 'Vampires and humans coexist uneasily. A half-blood detective navigates both worlds.',
    type: 'manga',
    genres: ['Horror', 'Mystery', 'Supernatural'],
    author: 'Kaori Yuki',
    artist: 'Kaori Yuki',
    status: 'ongoing',
    rating: 8.1,
    views: 72000,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clean existing data
    await Promise.all([
      User.deleteMany({}),
      Manga.deleteMany({}),
      Chapter.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@comic.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Admin user created: admin@comic.com / admin123');

    // Create regular user
    const user = await User.create({
      username: 'reader',
      email: 'reader@comic.com',
      password: 'reader123',
      role: 'user',
    });
    console.log('Reader user created: reader@comic.com / reader123');

    // Create manga entries
    const createdManga = [];
    for (const data of mangaData) {
      const manga = await Manga.create({
        ...data,
        slug: slugify(data.title, { lower: true, strict: true }),
        createdBy: admin._id,
      });
      createdManga.push(manga);
    }
    console.log(`${createdManga.length} manga entries created`);

    // Create chapters for each manga
    let totalChapters = 0;
    for (const manga of createdManga) {
      const chapterCount = Math.floor(Math.random() * 5) + 3; // 3-7 chapters each
      for (let i = 1; i <= chapterCount; i++) {
        await Chapter.create({
          chapterNumber: i,
          title: `Chapter ${i}`,
          manga: manga._id,
          images: [
            `/uploads/manga/${manga._id}/ch${i}/page1.jpg`,
            `/uploads/manga/${manga._id}/ch${i}/page2.jpg`,
            `/uploads/manga/${manga._id}/ch${i}/page3.jpg`,
          ],
        });
        totalChapters++;
      }
    }
    console.log(`${totalChapters} chapters created`);

    console.log('\nSeed completed successfully!');
    console.log('---');
    console.log('Admin: admin@comic.com / admin123');
    console.log('User:  reader@comic.com / reader123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
