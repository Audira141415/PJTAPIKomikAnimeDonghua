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

// Mock Manga model to avoid real DB queries
jest.mock('../../src/models', () => ({
  Manga: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue([
              {
                _id: '507f1f77bcf86cd799439011',
                title: 'Naruto',
                slug: 'naruto',
                type: 'manga',
                contentCategory: 'comic',
                status: 'completed',
                rating: 8.5,
                views: 5000,
              },
            ]),
          }),
        }),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
  },
}));

const app = require('../../src/app');
const cache = require('../../src/shared/utils/cache');

describe('Search Module - Advanced Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.get.mockResolvedValue(null);
  });

  it('should search by basic query', async () => {
    cache.set.mockResolvedValueOnce(undefined);
    
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'Naruto' })
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(cache.get).toHaveBeenCalled();
  });

  it('should accept type filter parameter', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'anime', type: 'anime' })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('should accept status filter parameter', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'test', status: 'ongoing' })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('should accept genre filter parameter', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'action', genre: 'action' })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('should accept year_from filter parameter', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'manga', year_from: 2007 })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('should accept year_to filter parameter', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'manga', year_to: 2010 })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('should combine multiple filters', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({
        q: 'anime',
        type: 'anime',
        status: 'ongoing',
        year_from: 2019,
        genre: 'action',
      })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('should paginate results', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'anime', page: 1, limit: 2 })
      .expect(200);

    expect(res.body.meta).toBeDefined();
  });

  it('should reject invalid status', async () => {
    await request(app)
      .get('/api/v1/search')
      .query({ q: 'test', status: 'invalid-status' })
      .expect(400);
  });

  it('should reject invalid year_from', async () => {
    await request(app)
      .get('/api/v1/search')
      .query({ q: 'test', year_from: 1800 })
      .expect(400);
  });

  it('should reject year_to beyond max', async () => {
    await request(app)
      .get('/api/v1/search')
      .query({ q: 'test', year_to: 2200 })
      .expect(400);
  });

  it('should reject query without search term', async () => {
    await request(app)
      .get('/api/v1/search')
      .query({ status: 'ongoing' })
      .expect(400);
  });
});
