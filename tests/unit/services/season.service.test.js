'use strict';

jest.mock('../../../src/repositories/season.repository');
jest.mock('../../../src/repositories/manga.repository');

const seasonRepo = require('../../../src/repositories/season.repository');
const mangaRepo = require('../../../src/repositories/manga.repository');
const seasonService = require('../../../src/modules/season/season.service');

describe('season.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createSeason rejects non-animation series', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'manga' });
    await expect(seasonService.createSeason({ seriesId: 's1', number: 1 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('createSeason rejects duplicate number', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'anime' });
    seasonRepo.findOne.mockResolvedValueOnce({ _id: 'season1' });

    await expect(seasonService.createSeason({ seriesId: 's1', number: 1 }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('createSeason stores new season', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'donghua' });
    seasonRepo.findOne.mockResolvedValueOnce(null);
    seasonRepo.create.mockResolvedValueOnce({ _id: 'season1' });

    const result = await seasonService.createSeason({ seriesId: 's1', number: 2, title: 'Arc 2' });

    expect(seasonRepo.create).toHaveBeenCalledWith({ series: 's1', number: 2, title: 'Arc 2' });
    expect(result).toMatchObject({ _id: 'season1' });
  });

  it('getSeasonsBySeries returns paginated data', async () => {
    mangaRepo.findById.mockResolvedValueOnce({ _id: 's1', type: 'anime' });
    seasonRepo.findBySeries.mockResolvedValueOnce([{ _id: 'season1' }]);
    seasonRepo.countBySeries.mockResolvedValueOnce(1);

    const result = await seasonService.getSeasonsBySeries('s1', { page: 1, limit: 20 });

    expect(result.seasons).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('getSeasonsBySeries throws 404 when series not found', async () => {
    mangaRepo.findById.mockResolvedValueOnce(null);
    await expect(seasonService.getSeasonsBySeries('bad', { page: 1, limit: 20 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('getSeasonById returns the season', async () => {
    seasonRepo.findById.mockResolvedValueOnce({ _id: 'season1', number: 1 });
    const result = await seasonService.getSeasonById('season1');
    expect(result).toMatchObject({ _id: 'season1' });
  });

  it('getSeasonById throws 404 when season not found', async () => {
    seasonRepo.findById.mockResolvedValueOnce(null);
    await expect(seasonService.getSeasonById('missing'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('updateSeason returns the updated season', async () => {
    seasonRepo.updateById.mockResolvedValueOnce({ _id: 'season1', title: 'Updated' });
    const result = await seasonService.updateSeason('season1', { title: 'Updated' });
    expect(result).toMatchObject({ title: 'Updated' });
  });

  it('updateSeason throws 404 when season not found', async () => {
    seasonRepo.updateById.mockResolvedValueOnce(null);
    await expect(seasonService.updateSeason('missing', {}))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteSeason returns the deleted season', async () => {
    seasonRepo.deleteById.mockResolvedValueOnce({ _id: 'season1' });
    const result = await seasonService.deleteSeason('season1');
    expect(result).toMatchObject({ _id: 'season1' });
  });

  it('deleteSeason throws 404 when season not found', async () => {
    seasonRepo.deleteById.mockResolvedValueOnce(null);
    await expect(seasonService.deleteSeason('missing'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
