'use strict';

jest.mock('../../../src/repositories/manga.repository');
jest.mock('../../../src/repositories/rating.repository');
jest.mock('../../../src/modules/trending/trending.service', () => ({
  invalidateTrendingCaches: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/models', () => ({
  Bookmark: { deleteMany: jest.fn().mockResolvedValue({}) },
  History: { deleteMany: jest.fn().mockResolvedValue({}) },
  Chapter: { deleteMany: jest.fn().mockResolvedValue({}) },
  Episode: { deleteMany: jest.fn().mockResolvedValue({}) },
  Season: { deleteMany: jest.fn().mockResolvedValue({}) },
  Review: { deleteMany: jest.fn().mockResolvedValue({}) },
}));

const mangaRepo = require('../../../src/repositories/manga.repository');
const { Bookmark, History, Chapter, Episode, Season, Review } = require('../../../src/models');
const trendingService = require('../../../src/modules/trending/trending.service');
const mangaService = require('../../../src/modules/manga/manga.service');

describe('manga.service extra flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getMangaList builds filters and pagination metadata', async () => {
    mangaRepo.findList.mockResolvedValueOnce([{ _id: 'm1' }]);
    mangaRepo.count.mockResolvedValueOnce(1);

    const result = await mangaService.getMangaList({
      page: 1,
      limit: 20,
      search: 'naruto',
      genre: 'Action',
      type: 'anime',
      contentCategory: 'animation',
      status: 'ongoing',
      sortBy: 'rating',
      order: 'desc',
    });

    expect(mangaRepo.findList).toHaveBeenCalled();
    expect(result.mangas).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('deleteManga cascades related documents', async () => {
    mangaRepo.deleteById.mockResolvedValueOnce({ _id: 'm1' });

    await mangaService.deleteManga('m1');

    expect(Bookmark.deleteMany).toHaveBeenCalledWith({ manga: 'm1' });
    expect(History.deleteMany).toHaveBeenCalledWith({ manga: 'm1' });
    expect(Chapter.deleteMany).toHaveBeenCalledWith({ manga: 'm1' });
    expect(Episode.deleteMany).toHaveBeenCalledWith({ series: 'm1' });
    expect(Season.deleteMany).toHaveBeenCalledWith({ series: 'm1' });
    expect(Review.deleteMany).toHaveBeenCalledWith({ series: 'm1' });
    expect(trendingService.invalidateTrendingCaches).toHaveBeenCalledTimes(1);
  });

  it('getRecommendations falls back to contentCategory when initial pool is short', async () => {
    const target = { _id: 'm1', type: 'anime', genres: ['Action'], contentCategory: 'animation' };
    mangaRepo.findById.mockResolvedValueOnce(target);
    mangaRepo.findList
      .mockResolvedValueOnce([{ _id: { toString: () => 'a1' } }])
      .mockResolvedValueOnce([
        { _id: { toString: () => 'a1' } },
        { _id: { toString: () => 'a2' } },
      ]);

    const result = await mangaService.getRecommendations('m1');

    expect(mangaRepo.findList).toHaveBeenCalledTimes(2);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
