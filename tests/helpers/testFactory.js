/**
 * Test Factory - Generate mock data for testing
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

class TestFactory {
  /**
   * Create a valid user object
   */
  static createUser(overrides = {}) {
    return {
      email: `user${Date.now()}@test.com`,
      username: `testuser${Date.now()}`,
      password: 'TestPassword123!',
      name: 'Test User',
      avatar: null,
      role: 'user',
      emailVerified: true,
      ...overrides,
    };
  }

  /**
   * Create a valid admin user object
   */
  static createAdminUser(overrides = {}) {
    return this.createUser({
      role: 'admin',
      email: `admin${Date.now()}@test.com`,
      ...overrides,
    });
  }

  /**
   * Create a valid manga object
   */
  static createManga(overrides = {}) {
    return {
      title: `Test Manga ${Date.now()}`,
      slug: `test-manga-${Date.now()}`,
      description: 'Test Description',
      alternativeTitles: ['Alt Title 1', 'Alt Title 2'],
      author: 'Test Author',
      artist: 'Test Artist',
      status: 'ongoing',
      type: 'manga',
      genres: ['action', 'adventure'],
      rating: 7.5,
      totalChapters: 100,
      releaseYear: 2023,
      source: 'komikindo',
      sourceId: `komikindo_${Date.now()}`,
      sourceUrl: 'https://example.com/manga/1',
      cover: {
        small: 'https://example.com/small.jpg',
        medium: 'https://example.com/medium.jpg',
        large: 'https://example.com/large.jpg',
      },
      ...overrides,
    };
  }

  /**
   * Create a valid chapter object
   */
  static createChapter(mangaId = null, overrides = {}) {
    return {
      manga: mangaId || new mongoose.Types.ObjectId(),
      chapterNumber: 1,
      title: 'Chapter 1: Beginning',
      slug: 'chapter-1-beginning',
      images: [
        { url: 'https://example.com/page1.jpg', pageNumber: 1 },
        { url: 'https://example.com/page2.jpg', pageNumber: 2 },
      ],
      source: 'komikindo',
      sourceId: `ch_${Date.now()}`,
      sourceUrl: 'https://example.com/chapter/1',
      releasedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a valid anime object
   */
  static createAnime(overrides = {}) {
    return {
      title: `Test Anime ${Date.now()}`,
      slug: `test-anime-${Date.now()}`,
      description: 'Test Anime Description',
      alternativeTitles: ['Alt Anime 1'],
      studios: ['Test Studio'],
      genres: ['action', 'adventure'],
      status: 'finished_airing',
      type: 'TV',
      episodes: 12,
      rating: 8.0,
      releaseYear: 2023,
      season: 'fall',
      source: 'anichin',
      sourceId: `anime_${Date.now()}`,
      sourceUrl: 'https://example.com/anime/1',
      cover: {
        small: 'https://example.com/anime_small.jpg',
        medium: 'https://example.com/anime_medium.jpg',
        large: 'https://example.com/anime_large.jpg',
      },
      ...overrides,
    };
  }

  /**
   * Create a valid episode object
   */
  static createEpisode(animeId = null, overrides = {}) {
    return {
      anime: animeId || new mongoose.Types.ObjectId(),
      episodeNumber: 1,
      title: 'Episode 1: Start',
      slug: 'episode-1-start',
      description: 'Episode description',
      thumbnail: 'https://example.com/ep1.jpg',
      streamUrl: 'https://example.com/stream/1',
      source: 'anichin',
      sourceId: `ep_${Date.now()}`,
      sourceUrl: 'https://example.com/episode/1',
      releasedAt: new Date(),
      duration: 24,
      ...overrides,
    };
  }

  /**
   * Create a valid comment object
   */
  static createComment(overrides = {}) {
    return {
      content: 'Great manga!',
      rating: 5,
      author: new mongoose.Types.ObjectId(),
      contentType: 'manga',
      contentId: new mongoose.Types.ObjectId(),
      ...overrides,
    };
  }

  /**
   * Create a valid bookmark object
   */
  static createBookmark(overrides = {}) {
    return {
      user: new mongoose.Types.ObjectId(),
      contentType: 'manga',
      contentId: new mongoose.Types.ObjectId(),
      status: 'reading',
      currentChapter: 1,
      ...overrides,
    };
  }

  /**
   * Generate random string for testing
   */
  static randomString(length = 10) {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  /**
   * Generate valid MongoDB ObjectId
   */
  static generateId() {
    return new mongoose.Types.ObjectId();
  }

  /**
   * Create mock environment variables
   */
  static mockEnv() {
    return {
      NODE_ENV: 'test',
      PORT: 3000,
      MONGODB_URI: 'mongodb://localhost:27017/audira-test',
      JWT_SECRET: 'test-secret-key',
      JWT_EXPIRE: '7d',
      REDIS_URL: 'redis://localhost:6379/1',
      CORS_ORIGIN: 'http://localhost:3000',
      EMAIL_FROM: 'test@example.com',
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: 587,
    };
  }
}

module.exports = TestFactory;
