'use strict';

// ── Mock dependencies before importing the service ───────────────────────────
jest.mock('../../../src/repositories/manga.repository');
jest.mock('../../../src/repositories/rating.repository');
jest.mock('../../../src/modules/trending/trending.service', () => ({
  invalidateTrendingCaches: jest.fn().mockResolvedValue(undefined),
}));

const mangaRepo  = require('../../../src/repositories/manga.repository');
const ratingRepo = require('../../../src/repositories/rating.repository');
const trendingService = require('../../../src/modules/trending/trending.service');
const { createManga, getMangaBySlug, updateManga, rateContent } = require('../../../src/modules/manga/manga.service');
const ApiError   = require('../../../src/shared/errors/ApiError');

const fakeUserId = '507f1f77bcf86cd799439011';
const fakeId     = '507f1f77bcf86cd799439012';

describe('manga.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createManga ─────────────────────────────────────────────────────────────
  describe('createManga', () => {
    it('sets contentCategory to "comic" for manga type', async () => {
      const data = { title: 'Test', type: 'manga' };
      mangaRepo.create.mockResolvedValueOnce({ ...data, contentCategory: 'comic' });

      await createManga(data, fakeUserId);

      expect(mangaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ contentCategory: 'comic', createdBy: fakeUserId }),
      );
      expect(trendingService.invalidateTrendingCaches).toHaveBeenCalledTimes(1);
    });

    it('sets contentCategory to "animation" for anime type', async () => {
      const data = { title: 'Test Anime', type: 'anime' };
      mangaRepo.create.mockResolvedValueOnce({ ...data, contentCategory: 'animation' });

      await createManga(data, fakeUserId);

      expect(mangaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ contentCategory: 'animation' }),
      );
      expect(trendingService.invalidateTrendingCaches).toHaveBeenCalledTimes(1);
    });
  });

  // ── getMangaBySlug ──────────────────────────────────────────────────────────
  describe('getMangaBySlug', () => {
    it('returns the manga when found', async () => {
      const fakeManga = { _id: fakeId, slug: 'naruto' };
      mangaRepo.findBySlug.mockResolvedValueOnce(fakeManga);

      const result = await getMangaBySlug('naruto');

      expect(result).toEqual(fakeManga);
    });

    it('throws ApiError 404 when not found', async () => {
      mangaRepo.findBySlug.mockResolvedValueOnce(null);

      await expect(getMangaBySlug('unknown-slug')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Series not found',
      });
    });
  });

  // ── updateManga ─────────────────────────────────────────────────────────────
  describe('updateManga', () => {
    it('updates contentCategory when type changes', async () => {
      mangaRepo.updateById.mockResolvedValueOnce({ _id: fakeId, type: 'donghua', contentCategory: 'animation' });

      await updateManga(fakeId, { type: 'donghua' });

      expect(mangaRepo.updateById).toHaveBeenCalledWith(
        fakeId,
        expect.objectContaining({ contentCategory: 'animation' }),
      );
      expect(trendingService.invalidateTrendingCaches).toHaveBeenCalledTimes(1);
    });

    it('throws ApiError 404 when series not found', async () => {
      mangaRepo.updateById.mockResolvedValueOnce(null);

      await expect(updateManga(fakeId, { title: 'Updated' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── rateContent ─────────────────────────────────────────────────────────────
  describe('rateContent', () => {
    it('calls ratingRepo.upsertRating with correct args', async () => {
      const fakeManga = { _id: fakeId };
      mangaRepo.findById.mockResolvedValueOnce(fakeManga);
      ratingRepo.upsertRating.mockResolvedValueOnce({ score: 8 });

      await rateContent(fakeId, fakeUserId, 8);

      expect(ratingRepo.upsertRating).toHaveBeenCalledWith(fakeUserId, fakeId, 8);
      expect(trendingService.invalidateTrendingCaches).toHaveBeenCalledTimes(1);
    });

    it('throws ApiError 404 when series does not exist', async () => {
      mangaRepo.findById.mockResolvedValueOnce(null);

      await expect(rateContent(fakeId, fakeUserId, 7)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Series not found',
      });
    });
  });
});
