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

  it('createEpisode throws 400 when series type is not animation', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'manga' });
    await expect(episodeService.createEpisode({ seriesId: 's1', episodeNumber: 1 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('createEpisode throws 404 when seasonId points to missing season', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'anime' });
    seasonRepo.findById.mockResolvedValueOnce(null);
    await expect(episodeService.createEpisode({ seriesId: 's1', seasonId: 'bad', episodeNumber: 1 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('createEpisode throws 409 on duplicate episode number', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'anime' });
    episodeRepo.findOne.mockResolvedValueOnce({ _id: 'existing' });
    await expect(episodeService.createEpisode({ seriesId: 's1', episodeNumber: 1 }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('createEpisode creates episode without season and skips incrementEpisodeCount', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'anime' });
    episodeRepo.findOne.mockResolvedValueOnce(null);
    episodeRepo.create.mockResolvedValueOnce({ _id: 'ep1' });

    await episodeService.createEpisode({ seriesId: 's1', episodeNumber: 3 });

    expect(episodeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ series: 's1', season: null }),
    );
    expect(seasonRepo.incrementEpisodeCount).not.toHaveBeenCalled();
  });

  it('getEpisodesBySeries returns paginated episodes', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'donghua' });
    episodeRepo.findBySeries.mockResolvedValueOnce([{ _id: 'ep1' }]);
    episodeRepo.countBySeries.mockResolvedValueOnce(1);

    const result = await episodeService.getEpisodesBySeries('s1', { page: 1, limit: 20 });

    expect(result.episodes).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('getEpisodeById throws 404 when episode not found', async () => {
    episodeRepo.findById.mockResolvedValueOnce(null);
    await expect(episodeService.getEpisodeById('missing'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('updateEpisode returns updated episode', async () => {
    episodeRepo.updateById.mockResolvedValueOnce({ _id: 'ep1', title: 'Ep 1 HD' });
    const result = await episodeService.updateEpisode('ep1', { title: 'Ep 1 HD' });
    expect(result).toMatchObject({ title: 'Ep 1 HD' });
    expect(episodeRepo.updateById).toHaveBeenCalledWith('ep1', { title: 'Ep 1 HD' });
  });

  it('updateEpisode throws 404 when episode not found', async () => {
    episodeRepo.updateById.mockResolvedValueOnce(null);
    await expect(episodeService.updateEpisode('missing', {}))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteEpisode throws 404 when episode not found', async () => {
    episodeRepo.findById.mockResolvedValueOnce(null);
    await expect(episodeService.deleteEpisode('missing'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteEpisode skips seasonRepo.incrementEpisodeCount when episode has no season', async () => {
    episodeRepo.findById.mockResolvedValueOnce({ _id: 'ep1', season: null });
    episodeRepo.deleteById.mockResolvedValueOnce({ _id: 'ep1' });

    await episodeService.deleteEpisode('ep1');

    expect(seasonRepo.incrementEpisodeCount).not.toHaveBeenCalled();
  });
});
