'use strict';

jest.mock('../../../src/repositories/manga.repository');
jest.mock('../../../src/repositories/bookmark.repository');
jest.mock('../../../src/modules/trending/trending.service', () => ({
  invalidateTrendingCaches: jest.fn().mockResolvedValue(undefined),
}));

const mangaRepo = require('../../../src/repositories/manga.repository');
const bookmarkRepo = require('../../../src/repositories/bookmark.repository');
const trendingService = require('../../../src/modules/trending/trending.service');
const bookmarkService = require('../../../src/modules/bookmark/bookmark.service');

describe('bookmark.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates bookmark and invalidates trending caches when bookmark does not exist', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 'm1' });
    bookmarkRepo.findOne.mockResolvedValueOnce(null);
    bookmarkRepo.create.mockResolvedValueOnce({ _id: 'b1' });

    const result = await bookmarkService.toggleBookmark('u1', 'm1');

    expect(result).toEqual({ bookmarked: true });
    expect(bookmarkRepo.create).toHaveBeenCalledWith('u1', 'm1');
    expect(trendingService.invalidateTrendingCaches).toHaveBeenCalledTimes(1);
  });

  it('removes bookmark and invalidates trending caches when bookmark exists', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 'm1' });
    bookmarkRepo.findOne.mockResolvedValueOnce({ _id: 'b1' });
    bookmarkRepo.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    const result = await bookmarkService.toggleBookmark('u1', 'm1');

    expect(result).toEqual({ bookmarked: false });
    expect(bookmarkRepo.deleteOne).toHaveBeenCalledWith('b1');
    expect(trendingService.invalidateTrendingCaches).toHaveBeenCalledTimes(1);
  });
});
