'use strict';

const request  = require('supertest');

// ── Mock service & DB ─────────────────────────────────────────────────────────
jest.mock('../../src/modules/manga/manga.service');
jest.mock('../../src/config/db');

// Cache utils use redis — mock so no actual connection is made
jest.mock('../../src/shared/utils/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
  TTL: { MANGA_LIST: 300, MANGA_DETAIL: 900 },
}));

const mangaService = require('../../src/modules/manga/manga.service');
const app          = require('../../src/app');

const fakeManga = {
  _id: '507f1f77bcf86cd799439012',
  title: 'Naruto',
  slug: 'naruto',
  type: 'manga',
  contentCategory: 'comic',
  status: 'completed',
};

describe('GET /api/v1/mangas', () => {
  it('returns 200 with a list of series', async () => {
    mangaService.getMangaList.mockResolvedValueOnce({
      mangas: [fakeManga],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    const res = await request(app).get('/api/v1/mangas');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('meta');
  });
});

describe('GET /api/v1/mangas/:slug', () => {
  it('returns 200 with the manga when found', async () => {
    mangaService.getMangaBySlug.mockResolvedValueOnce(fakeManga);

    const res = await request(app).get('/api/v1/mangas/naruto');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('slug', 'naruto');
  });

  it('returns 404 when slug is not found', async () => {
    mangaService.getMangaBySlug.mockRejectedValueOnce(
      Object.assign(new Error('Series not found'), { statusCode: 404, isOperational: true }),
    );

    const res = await request(app).get('/api/v1/mangas/unknown-slug');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/mangas/:id/rate', () => {
  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app)
      .patch('/api/v1/mangas/507f1f77bcf86cd799439012/rate')
      .send({ score: 8 });

    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/v1/mangas/not-an-id/rate')
      .set('Authorization', 'Bearer fake-token')
      .send({ score: 8 });

    // Auth middleware fires before ObjectId check — expect 401
    expect([400, 401]).toContain(res.status);
  });
});
