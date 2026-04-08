'use strict';

const request = require('supertest');

// ── Mock dependencies before requiring app ─────────────────────────────────────
jest.mock('../../src/config/db');

jest.mock('../../src/shared/utils/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/modules/trending/trending.service');

const app = require('../../src/app');
const cache = require('../../src/shared/utils/cache');
const trendingService = require('../../src/modules/trending/trending.service');

const mockMangaData = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Popular Manga',
  slug: 'popular-manga',
  type: 'manga',
  contentCategory: 'comic',
  status: 'ongoing',
  rating: 8.5,
  views: 5000,
  coverImage: 'https://example.com/image.jpg',
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
};

describe('Trending Module - Discovery Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.get.mockResolvedValue(null);
  });

  describe('GET /api/v1/trending', () => {
    it('should get trending manga with default parameters', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { period: 'week', limit: 10, count: 1 },
      };
      trendingService.getTrendingByBookmarks.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/trending')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(trendingService.getTrendingByBookmarks).toHaveBeenCalledWith('week', 10);
    });

    it('should accept period=week parameter', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { period: 'week', limit: 10, count: 1 },
      };
      trendingService.getTrendingByBookmarks.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/trending')
        .query({ period: 'week' })
        .expect(200);

      expect(trendingService.getTrendingByBookmarks).toHaveBeenCalledWith('week', 10);
    });

    it('should accept period=month parameter', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { period: 'month', limit: 10, count: 1 },
      };
      trendingService.getTrendingByBookmarks.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/trending')
        .query({ period: 'month' })
        .expect(200);

      expect(trendingService.getTrendingByBookmarks).toHaveBeenCalledWith('month', 10);
    });

    it('should accept period=all parameter', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { period: 'all', limit: 10, count: 1 },
      };
      trendingService.getTrendingByBookmarks.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/trending')
        .query({ period: 'all' })
        .expect(200);

      expect(trendingService.getTrendingByBookmarks).toHaveBeenCalledWith('all', 10);
    });

    it('should accept limit parameter', async () => {
      const mockResponse = {
        data: Array(5).fill(mockMangaData),
        meta: { period: 'week', limit: 5, count: 5 },
      };
      trendingService.getTrendingByBookmarks.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/trending')
        .query({ limit: 5 })
        .expect(200);

      expect(trendingService.getTrendingByBookmarks).toHaveBeenCalledWith('week', 5);
    });

    it('should reject invalid period', async () => {
      await request(app)
        .get('/api/v1/trending')
        .query({ period: 'invalid' })
        .expect(400);
    });

    it('should reject limit > 100', async () => {
      await request(app)
        .get('/api/v1/trending')
        .query({ limit: 200 })
        .expect(400);
    });
  });

  describe('GET /api/v1/popular', () => {
    it('should get popular manga with default metric', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { metric: 'bookmarks', limit: 10, count: 1 },
      };
      trendingService.getPopularByMetric.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/popular')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta.metric).toBe('bookmarks');
      expect(trendingService.getPopularByMetric).toHaveBeenCalledWith('bookmarks', 10);
    });

    it('should accept metric=bookmarks', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { metric: 'bookmarks', limit: 10, count: 1 },
      };
      trendingService.getPopularByMetric.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/popular')
        .query({ metric: 'bookmarks' })
        .expect(200);

      expect(trendingService.getPopularByMetric).toHaveBeenCalledWith('bookmarks', 10);
    });

    it('should accept metric=ratings', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { metric: 'ratings', limit: 10, count: 1 },
      };
      trendingService.getPopularByMetric.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/popular')
        .query({ metric: 'ratings' })
        .expect(200);

      expect(trendingService.getPopularByMetric).toHaveBeenCalledWith('ratings', 10);
    });

    it('should accept metric=views', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { metric: 'views', limit: 10, count: 1 },
      };
      trendingService.getPopularByMetric.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/popular')
        .query({ metric: 'views' })
        .expect(200);

      expect(trendingService.getPopularByMetric).toHaveBeenCalledWith('views', 10);
    });

    it('should accept metric=avg_rating', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { metric: 'avg_rating', limit: 10, count: 1 },
      };
      trendingService.getPopularByMetric.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/popular')
        .query({ metric: 'avg_rating' })
        .expect(200);

      expect(trendingService.getPopularByMetric).toHaveBeenCalledWith('avg_rating', 10);
    });

    it('should accept limit parameter', async () => {
      const mockResponse = {
        data: Array(20).fill(mockMangaData),
        meta: { metric: 'bookmarks', limit: 20, count: 20 },
      };
      trendingService.getPopularByMetric.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/popular')
        .query({ limit: 20 })
        .expect(200);

      expect(trendingService.getPopularByMetric).toHaveBeenCalledWith('bookmarks', 20);
    });

    it('should reject invalid metric', async () => {
      await request(app)
        .get('/api/v1/popular')
        .query({ metric: 'invalid-metric' })
        .expect(400);
    });

    it('should reject limit > 100', async () => {
      await request(app)
        .get('/api/v1/popular')
        .query({ limit: 150 })
        .expect(400);
    });
  });

  describe('GET /api/v1/latest', () => {
    it('should get latest manga with default limit', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { type: 'latest', limit: 10, count: 1 },
      };
      trendingService.getLatestManga.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/latest')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta.type).toBe('latest');
      expect(trendingService.getLatestManga).toHaveBeenCalledWith(10);
    });

    it('should accept limit parameter', async () => {
      const mockResponse = {
        data: Array(20).fill(mockMangaData),
        meta: { type: 'latest', limit: 20, count: 20 },
      };
      trendingService.getLatestManga.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/latest')
        .query({ limit: 20 })
        .expect(200);

      expect(trendingService.getLatestManga).toHaveBeenCalledWith(20);
    });

    it('should return data in expected format', async () => {
      const mockResponse = {
        data: [mockMangaData],
        meta: { type: 'latest', limit: 10, count: 1 },
      };
      trendingService.getLatestManga.mockResolvedValueOnce(mockResponse);

      const res = await request(app)
        .get('/api/v1/latest')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('type', 'latest');
    });

    it('should reject limit > 100', async () => {
      await request(app)
        .get('/api/v1/latest')
        .query({ limit: 200 })
        .expect(400);
    });
  });
});
