'use strict';

jest.mock('../../../src/models', () => ({
  Manga: { findById: jest.fn() },
  Chapter: { findById: jest.fn() },
  Episode: { findById: jest.fn() },
}));
jest.mock('../../../src/repositories/history.repository');

const { Manga, Chapter, Episode } = require('../../../src/models');
const historyRepo = require('../../../src/repositories/history.repository');
const historyService = require('../../../src/modules/history/history.service');

function makeLeanResult(payload) {
  return { lean: jest.fn().mockResolvedValue(payload) };
}

describe('history.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('addHistory comic path validates manga and chapter', async () => {
    Manga.findById.mockReturnValueOnce(makeLeanResult({ _id: 'm1' }));
    Chapter.findById.mockReturnValueOnce(makeLeanResult({ _id: 'c1' }));
    historyRepo.upsert.mockResolvedValueOnce({ _id: 'h1' });

    const result = await historyService.addHistory('u1', {
      mangaId: 'm1',
      contentType: 'comic',
      chapterId: 'c1',
    });

    expect(historyRepo.upsert).toHaveBeenCalledWith('u1', 'm1', {
      chapterId: 'c1',
      contentType: 'comic',
    });
    expect(result).toMatchObject({ _id: 'h1' });
  });

  it('addHistory animation path validates episode', async () => {
    Manga.findById.mockReturnValueOnce(makeLeanResult({ _id: 'm1' }));
    Episode.findById.mockReturnValueOnce(makeLeanResult({ _id: 'e1' }));
    historyRepo.upsert.mockResolvedValueOnce({ _id: 'h1' });

    await historyService.addHistory('u1', {
      mangaId: 'm1',
      contentType: 'animation',
      episodeId: 'e1',
      watchProgress: 75,
    });

    expect(historyRepo.upsert).toHaveBeenCalledWith('u1', 'm1', {
      episodeId: 'e1',
      contentType: 'animation',
      watchProgress: 75,
    });
  });

  it('getHistory returns paginated history', async () => {
    historyRepo.findByUser.mockResolvedValueOnce([{ _id: 'h1' }]);
    historyRepo.countByUser.mockResolvedValueOnce(1);

    const result = await historyService.getHistory('u1', { page: 1, limit: 20, contentType: 'comic' });

    expect(result.history).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});
