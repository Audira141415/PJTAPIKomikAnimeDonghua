'use strict';

const request = require('supertest');

// ── Mock dependencies before requiring app ───────────────────────────────────
jest.mock('../../src/config/db');

jest.mock('../../src/shared/utils/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/modules/donghua/donghua.service');

const app = require('../../src/app');
const donghuaService = require('../../src/modules/donghua/donghua.service');
const ApiError = require('../../src/shared/errors/ApiError');

// ── Shared Fixtures ───────────────────────────────────────────────────────────

const mockSeriesCard = {
  title: 'Battle Through the Heavens',
  slug: 'battle-through-the-heavens',
  poster: 'https://example.com/cover.jpg',
  status: 'Ongoing',
  type: 'Donghua',
  episodes: '105 episodes',
  alternative: 'Doupo Cangqiong',
  rating: 8.5,
  studio: 'B&T Studio',
  description: 'A short description of the series.',
  genres: [
    { name: 'Action', href: '/donghua/genres/action', anichinUrl: 'https://anichin.cafe/genres/action/' },
  ],
  href: '/donghua/detail/battle-through-the-heavens',
  anichinUrl: 'https://anichin.cafe/battle-through-the-heavens/',
};

const mockLatestEpisode = {
  title: 'Battle Through the Heavens Episode 105',
  seriesSlug: 'battle-through-the-heavens',
  poster: 'https://example.com/cover.jpg',
  status: 'Ongoing',
  type: 'Donghua',
  current_episode: 'Ep 105',
  href: '/donghua/episode/btth-ep-105',
  anichinUrl: null,
};

const mockMeta = { total: 1, page: 1, limit: 20, totalPages: 1 };

const mockDetailData = {
  status: 'Ongoing',
  creator: null,
  title: 'Battle Through the Heavens',
  alter_title: 'Doupo Cangqiong',
  slug: 'battle-through-the-heavens',
  poster: 'https://example.com/cover.jpg',
  rating: '8.5',
  studio: 'B&T Studio',
  network: null,
  released: '2018',
  duration: '15 min',
  type: 'Donghua',
  episodes_count: '105',
  season: '2018',
  country: 'China',
  released_on: null,
  updated_on: new Date().toISOString(),
  synopsis: 'Full synopsis here.',
  genres: [
    { name: 'Action', slug: 'action', href: '/donghua/genres/action', anichinUrl: 'https://anichin.cafe/genres/action/' },
  ],
  tags: [],
  seasons: [{ number: 1, title: 'Season 1', year: 2018 }],
  episodes_list: [
    { episode: 'BTTH Episode 105', slug: 'btth-ep-105', href: '/donghua/episode/btth-ep-105', anichinUrl: null },
  ],
  href: '/donghua/detail/battle-through-the-heavens',
  sourceUrl: 'https://anichin.cafe/battle-through-the-heavens/',
  views: 15000,
  ratingCount: 320,
  createdAt: new Date().toISOString(),
};

const mockEpisodeData = {
  series: {
    title: 'Battle Through the Heavens',
    slug: 'battle-through-the-heavens',
    poster: 'https://example.com/cover.jpg',
    href: '/donghua/detail/battle-through-the-heavens',
  },
  episode: {
    _id: '507f1f77bcf86cd799439001',
    episodeNumber: 105,
    title: 'BTTH Episode 105',
    slug: 'btth-ep-105',
    sourceUrl: null,
    season: { number: 1, title: 'Season 1', year: 2018 },
  },
  navigation: {
    prev: { _id: '507f1f77bcf86cd799439000', slug: 'btth-ep-104', episodeNumber: 104, title: 'BTTH Episode 104' },
    next: null,
  },
};

const mockGenreList = [
  { name: 'Action',   slug: 'action',   href: '/donghua/genres/action',   anichinUrl: 'https://anichin.cafe/genres/action/' },
  { name: 'Fantasy',  slug: 'fantasy',  href: '/donghua/genres/fantasy',  anichinUrl: 'https://anichin.cafe/genres/fantasy/' },
  { name: 'Romance',  slug: 'romance',  href: '/donghua/genres/romance',  anichinUrl: 'https://anichin.cafe/genres/romance/' },
];

// ── Test Suites ───────────────────────────────────────────────────────────────

describe('Donghua API - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── GET /api/v1/donghua/home ────────────────────────────────────────────────
  describe('GET /api/v1/donghua/home', () => {
    it('returns 200 with latest_release and completed_donghua arrays', async () => {
      const mockHomeData = {
        creator: 'Donghua API',
        latest_release: [mockLatestEpisode],
        completed_donghua: [mockSeriesCard],
      };
      donghuaService.getHome.mockResolvedValueOnce(mockHomeData);

      const res = await request(app).get('/api/v1/donghua/home').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.latest_release).toBeInstanceOf(Array);
      expect(res.body.data.completed_donghua).toBeInstanceOf(Array);
      expect(donghuaService.getHome).toHaveBeenCalledTimes(1);
    });

    it('returns empty arrays when no donghua data exists', async () => {
      donghuaService.getHome.mockResolvedValueOnce({
        creator: 'Donghua API',
        latest_release: [],
        completed_donghua: [],
      });

      const res = await request(app).get('/api/v1/donghua/home').expect(200);

      expect(res.body.data.latest_release).toHaveLength(0);
      expect(res.body.data.completed_donghua).toHaveLength(0);
    });

    it('returns 500 when service throws unexpected error', async () => {
      donghuaService.getHome.mockRejectedValueOnce(new Error('DB failure'));

      await request(app).get('/api/v1/donghua/home').expect(500);
    });
  });

  // ─── GET /api/v1/donghua/ongoing ────────────────────────────────────────────
  describe('GET /api/v1/donghua/ongoing', () => {
    it('returns 200 with ongoing_donghua list and meta', async () => {
      donghuaService.getOngoing.mockResolvedValueOnce({
        creator: 'Donghua API',
        ongoing_donghua: [mockSeriesCard],
        meta: mockMeta,
      });

      const res = await request(app).get('/api/v1/donghua/ongoing').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(1);
      expect(donghuaService.getOngoing).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
      });
    });

    it('passes page and limit query params to service', async () => {
      donghuaService.getOngoing.mockResolvedValueOnce({
        creator: 'Donghua API',
        ongoing_donghua: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      });

      await request(app)
        .get('/api/v1/donghua/ongoing')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(donghuaService.getOngoing).toHaveBeenCalledWith({
        page: '2',
        limit: '10',
      });
    });

    it('returns 500 when service throws unexpected error', async () => {
      donghuaService.getOngoing.mockRejectedValueOnce(new Error('DB failure'));

      await request(app).get('/api/v1/donghua/ongoing').expect(500);
    });
  });

  // ─── GET /api/v1/donghua/completed ──────────────────────────────────────────
  describe('GET /api/v1/donghua/completed', () => {
    it('returns 200 with completed_donghua list and meta', async () => {
      donghuaService.getCompleted.mockResolvedValueOnce({
        creator: 'Donghua API',
        completed_donghua: [mockSeriesCard],
        meta: mockMeta,
      });

      const res = await request(app).get('/api/v1/donghua/completed').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(donghuaService.getCompleted).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
      });
    });

    it('passes page and limit query params to service', async () => {
      donghuaService.getCompleted.mockResolvedValueOnce({
        creator: 'Donghua API',
        completed_donghua: [],
        meta: { total: 0, page: 3, limit: 5, totalPages: 0 },
      });

      await request(app)
        .get('/api/v1/donghua/completed')
        .query({ page: 3, limit: 5 })
        .expect(200);

      expect(donghuaService.getCompleted).toHaveBeenCalledWith({
        page: '3',
        limit: '5',
      });
    });

    it('returns 500 when service throws unexpected error', async () => {
      donghuaService.getCompleted.mockRejectedValueOnce(new Error('DB failure'));

      await request(app).get('/api/v1/donghua/completed').expect(500);
    });
  });

  // ─── GET /api/v1/donghua/search ─────────────────────────────────────────────
  describe('GET /api/v1/donghua/search (Pencarian)', () => {
    it('returns 200 with search results when q param is provided', async () => {
      donghuaService.search.mockResolvedValueOnce({
        creator: 'Donghua API',
        query: 'battle through',
        results: [mockSeriesCard],
        meta: mockMeta,
      });

      const res = await request(app)
        .get('/api/v1/donghua/search')
        .query({ q: 'battle through' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.message).toContain('battle through');
      expect(donghuaService.search).toHaveBeenCalledWith({
        q: 'battle through',
        page: undefined,
        limit: undefined,
      });
    });

    it('returns 400 when q param is missing', async () => {
      donghuaService.search.mockRejectedValueOnce(
        new ApiError(400, 'Query parameter "q" is required')
      );

      const res = await request(app).get('/api/v1/donghua/search').expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when q param is whitespace-only', async () => {
      donghuaService.search.mockRejectedValueOnce(
        new ApiError(400, 'Query parameter "q" is required')
      );

      const res = await request(app)
        .get('/api/v1/donghua/search')
        .query({ q: '   ' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('passes page and limit query params to service', async () => {
      donghuaService.search.mockResolvedValueOnce({
        creator: 'Donghua API',
        query: 'soul land',
        results: [],
        meta: { total: 0, page: 2, limit: 5, totalPages: 0 },
      });

      await request(app)
        .get('/api/v1/donghua/search')
        .query({ q: 'soul land', page: 2, limit: 5 })
        .expect(200);

      expect(donghuaService.search).toHaveBeenCalledWith({
        q: 'soul land',
        page: '2',
        limit: '5',
      });
    });

    it('returns empty results array when no match found', async () => {
      donghuaService.search.mockResolvedValueOnce({
        creator: 'Donghua API',
        query: 'nonexistent series xyz',
        results: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const res = await request(app)
        .get('/api/v1/donghua/search')
        .query({ q: 'nonexistent series xyz' })
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // ─── GET /api/v1/donghua/genres (Daftar Genre) ──────────────────────────────
  describe('GET /api/v1/donghua/genres', () => {
    it('returns 200 with list of genres', async () => {
      donghuaService.getGenres.mockResolvedValueOnce(mockGenreList);

      const res = await request(app).get('/api/v1/donghua/genres').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('slug');
      expect(res.body.data[0]).toHaveProperty('href');
      expect(donghuaService.getGenres).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no genres exist', async () => {
      donghuaService.getGenres.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/v1/donghua/genres').expect(200);

      expect(res.body.data).toHaveLength(0);
    });

    it('returns 500 when service throws unexpected error', async () => {
      donghuaService.getGenres.mockRejectedValueOnce(new Error('DB failure'));

      await request(app).get('/api/v1/donghua/genres').expect(500);
    });
  });

  // ─── GET /api/v1/donghua/genre/:genre (By Genre) ────────────────────────────
  describe('GET /api/v1/donghua/genre/:genre', () => {
    it('returns 200 with donghua list for a valid genre', async () => {
      donghuaService.getByGenre.mockResolvedValueOnce({
        creator: 'Donghua API',
        genre: 'Action',
        donghua: [mockSeriesCard],
        meta: mockMeta,
      });

      const res = await request(app)
        .get('/api/v1/donghua/genre/action')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.message).toContain('Action');
      expect(donghuaService.getByGenre).toHaveBeenCalledWith('action', {
        page: undefined,
        limit: undefined,
      });
    });

    it('passes page and limit to service', async () => {
      donghuaService.getByGenre.mockResolvedValueOnce({
        creator: 'Donghua API',
        genre: 'Fantasy',
        donghua: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      });

      await request(app)
        .get('/api/v1/donghua/genre/fantasy')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(donghuaService.getByGenre).toHaveBeenCalledWith('fantasy', {
        page: '2',
        limit: '10',
      });
    });

    it('returns 404 when genre does not exist', async () => {
      donghuaService.getByGenre.mockRejectedValueOnce(
        new ApiError(404, 'Genre "unknown-genre" not found')
      );

      const res = await request(app)
        .get('/api/v1/donghua/genre/unknown-genre')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/v1/donghua/year/:year (By Season/Tahun) ───────────────────────
  describe('GET /api/v1/donghua/year/:year', () => {
    it('returns 200 with donghua list for a valid year', async () => {
      donghuaService.getByYear.mockResolvedValueOnce({
        creator: 'Donghua API',
        year: 2024,
        donghua: [mockSeriesCard],
        meta: mockMeta,
      });

      const res = await request(app)
        .get('/api/v1/donghua/year/2024')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.message).toContain('2024');
      expect(donghuaService.getByYear).toHaveBeenCalledWith('2024', {
        page: undefined,
        limit: undefined,
      });
    });

    it('passes page and limit to service', async () => {
      donghuaService.getByYear.mockResolvedValueOnce({
        creator: 'Donghua API',
        year: 2023,
        donghua: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      });

      await request(app)
        .get('/api/v1/donghua/year/2023')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(donghuaService.getByYear).toHaveBeenCalledWith('2023', {
        page: '2',
        limit: '10',
      });
    });

    it('returns 400 when year is not a valid number', async () => {
      donghuaService.getByYear.mockRejectedValueOnce(
        new ApiError(400, 'Invalid year')
      );

      const res = await request(app)
        .get('/api/v1/donghua/year/abcd')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when year is out of range', async () => {
      donghuaService.getByYear.mockRejectedValueOnce(
        new ApiError(400, 'Invalid year')
      );

      const res = await request(app)
        .get('/api/v1/donghua/year/1800')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns empty array when no donghua found for valid year', async () => {
      donghuaService.getByYear.mockResolvedValueOnce({
        creator: 'Donghua API',
        year: 2000,
        donghua: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const res = await request(app)
        .get('/api/v1/donghua/year/2000')
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // ─── GET /api/v1/donghua/episode/:episodeSlug (Nonton Episode) ──────────────
  describe('GET /api/v1/donghua/episode/:episodeSlug', () => {
    it('returns 200 with episode data and navigation', async () => {
      donghuaService.watchEpisode.mockResolvedValueOnce(mockEpisodeData);

      const res = await request(app)
        .get('/api/v1/donghua/episode/btth-ep-105')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.series).toBeDefined();
      expect(res.body.data.episode).toBeDefined();
      expect(res.body.data.navigation).toBeDefined();
      expect(res.body.data.navigation).toHaveProperty('prev');
      expect(res.body.data.navigation).toHaveProperty('next');
      expect(donghuaService.watchEpisode).toHaveBeenCalledWith('btth-ep-105');
    });

    it('returns navigation.next=null for last episode', async () => {
      donghuaService.watchEpisode.mockResolvedValueOnce({
        ...mockEpisodeData,
        navigation: { prev: null, next: null },
      });

      const res = await request(app)
        .get('/api/v1/donghua/episode/btth-ep-001')
        .expect(200);

      expect(res.body.data.navigation.prev).toBeNull();
      expect(res.body.data.navigation.next).toBeNull();
    });

    it('returns 404 when episode slug does not exist', async () => {
      donghuaService.watchEpisode.mockRejectedValueOnce(
        new ApiError(404, 'Episode not found')
      );

      const res = await request(app)
        .get('/api/v1/donghua/episode/nonexistent-slug')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('returns 404 when episode belongs to non-donghua series', async () => {
      donghuaService.watchEpisode.mockRejectedValueOnce(
        new ApiError(404, 'Donghua episode not found')
      );

      const res = await request(app)
        .get('/api/v1/donghua/episode/manga-episode-slug')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/v1/donghua/:slug (Detail) ─────────────────────────────────────
  describe('GET /api/v1/donghua/:slug', () => {
    it('returns 200 with full series detail', async () => {
      donghuaService.getDetail.mockResolvedValueOnce(mockDetailData);

      const res = await request(app)
        .get('/api/v1/donghua/battle-through-the-heavens')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBe('Battle Through the Heavens');
      expect(res.body.data.slug).toBe('battle-through-the-heavens');
      expect(res.body.data.genres).toBeInstanceOf(Array);
      expect(res.body.data.episodes_list).toBeInstanceOf(Array);
      expect(res.body.data.seasons).toBeInstanceOf(Array);
      expect(donghuaService.getDetail).toHaveBeenCalledWith('battle-through-the-heavens');
    });

    it('includes correct detail fields', async () => {
      donghuaService.getDetail.mockResolvedValueOnce(mockDetailData);

      const res = await request(app)
        .get('/api/v1/donghua/battle-through-the-heavens')
        .expect(200);

      const { data } = res.body;
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('type');
      expect(data).toHaveProperty('synopsis');
      expect(data).toHaveProperty('episodes_count');
      expect(data).toHaveProperty('views');
      expect(data).toHaveProperty('href');
    });

    it('returns 404 when slug does not exist', async () => {
      donghuaService.getDetail.mockRejectedValueOnce(
        new ApiError(404, 'Donghua not found')
      );

      const res = await request(app)
        .get('/api/v1/donghua/nonexistent-series')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('returns 500 when service throws unexpected error', async () => {
      donghuaService.getDetail.mockRejectedValueOnce(new Error('DB failure'));

      await request(app)
        .get('/api/v1/donghua/some-series')
        .expect(500);
    });
  });

  // ─── Route ordering guard ────────────────────────────────────────────────────
  describe('Route collision prevention', () => {
    it('/home is not caught by /:slug route', async () => {
      donghuaService.getHome.mockResolvedValueOnce({
        creator: 'Donghua API',
        latest_release: [],
        completed_donghua: [],
      });

      const res = await request(app).get('/api/v1/donghua/home').expect(200);

      expect(donghuaService.getHome).toHaveBeenCalledTimes(1);
      expect(donghuaService.getDetail).not.toHaveBeenCalled();
    });

    it('/genres is not caught by /:slug route', async () => {
      donghuaService.getGenres.mockResolvedValueOnce(mockGenreList);

      await request(app).get('/api/v1/donghua/genres').expect(200);

      expect(donghuaService.getGenres).toHaveBeenCalledTimes(1);
      expect(donghuaService.getDetail).not.toHaveBeenCalled();
    });

    it('/search is not caught by /:slug route', async () => {
      donghuaService.search.mockResolvedValueOnce({
        creator: 'Donghua API',
        query: 'test',
        results: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await request(app)
        .get('/api/v1/donghua/search')
        .query({ q: 'test' })
        .expect(200);

      expect(donghuaService.search).toHaveBeenCalledTimes(1);
      expect(donghuaService.getDetail).not.toHaveBeenCalled();
    });

    it('/ongoing is not caught by /:slug route', async () => {
      donghuaService.getOngoing.mockResolvedValueOnce({
        creator: 'Donghua API',
        ongoing_donghua: [],
        meta: mockMeta,
      });

      await request(app).get('/api/v1/donghua/ongoing').expect(200);

      expect(donghuaService.getOngoing).toHaveBeenCalledTimes(1);
      expect(donghuaService.getDetail).not.toHaveBeenCalled();
    });
  });
});
