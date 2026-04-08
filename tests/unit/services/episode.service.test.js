'use strict';

jest.mock('../../../src/repositories/episode.repository');
jest.mock('../../../src/repositories/season.repository');
jest.mock('../../../src/repositories/manga.repository');

const episodeRepo = require('../../../src/repositories/episode.repository');
const seasonRepo = require('../../../src/repositories/season.repository');
const mangaRepo = require('../../../src/repositories/manga.repository');
const episodeService = require('../../../src/modules/episode/episode.service');

describe('episode.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createEpisode rejects missing series', async () => {
    mangaRepo.findById.mockResolvedValueOnce(null);
    await expect(episodeService.createEpisode({ seriesId: 's1', episodeNumber: 1 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('createEpisode rejects invalid season ownership', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'anime' });
    seasonRepo.findById.mockResolvedValueOnce({ _id: 'season1', series: { toString: () => 'other-series' } });

    await expect(episodeService.createEpisode({ seriesId: 's1', seasonId: 'season1', episodeNumber: 1 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('createEpisode increments season count when season is set', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'donghua' });
    seasonRepo.findById.mockResolvedValueOnce({ _id: 'season1', series: { toString: () => 's1' } });
    episodeRepo.findOne.mockResolvedValueOnce(null);
    episodeRepo.create.mockResolvedValueOnce({ _id: 'ep1' });
    seasonRepo.incrementEpisodeCount.mockResolvedValueOnce({});

    await episodeService.createEpisode({ seriesId: 's1', seasonId: 'season1', episodeNumber: 2 });

    expect(seasonRepo.incrementEpisodeCount).toHaveBeenCalledWith('season1', 1);
  });

  it('getEpisodeById increments views', async () => {
    episodeRepo.findById.mockResolvedValueOnce({ _id: 'ep1' });
    episodeRepo.incrementViews.mockResolvedValueOnce({ _id: 'ep1', views: 10 });

    const result = await episodeService.getEpisodeById('ep1');

    expect(episodeRepo.incrementViews).toHaveBeenCalledWith('ep1');
    expect(result).toMatchObject({ _id: 'ep1' });
  });

  it('deleteEpisode decrements season count when episode has season', async () => {
    episodeRepo.findById.mockResolvedValueOnce({ _id: 'ep1', season: 'season1' });
    episodeRepo.deleteById.mockResolvedValueOnce({ _id: 'ep1' });
    seasonRepo.incrementEpisodeCount.mockResolvedValueOnce({});

    await episodeService.deleteEpisode('ep1');

    expect(seasonRepo.incrementEpisodeCount).toHaveBeenCalledWith('season1', -1);
  });
});
