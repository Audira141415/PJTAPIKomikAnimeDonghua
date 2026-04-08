'use strict';

jest.mock('../../../src/repositories/collection.repository');
jest.mock('../../../src/repositories/manga.repository');

const collectionRepo = require('../../../src/repositories/collection.repository');
const mangaRepo = require('../../../src/repositories/manga.repository');
const collectionService = require('../../../src/modules/collection/collection.service');

describe('collection.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createCollection creates collection for user', async () => {
    const payload = { _id: 'c1', user: 'u1', name: 'Favorites' };
    collectionRepo.create.mockResolvedValueOnce(payload);

    const result = await collectionService.createCollection('u1', { name: 'Favorites', visibility: 'private' });

    expect(collectionRepo.create).toHaveBeenCalledWith({ user: 'u1', name: 'Favorites', visibility: 'private' });
    expect(result).toEqual(payload);
  });

  it('createCollection maps duplicate key to 409', async () => {
    collectionRepo.create.mockRejectedValueOnce({ code: 11000 });

    await expect(collectionService.createCollection('u1', { name: 'Favorites' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('addItemToCollection throws 404 when manga does not exist', async () => {
    collectionRepo.findByIdForUpdate.mockResolvedValueOnce({
      user: 'u1',
      items: [],
    });
    mangaRepo.findById.mockResolvedValueOnce(null);

    await expect(collectionService.addItemToCollection('c1', 'u1', 'm1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('addItemToCollection throws 409 for duplicate manga', async () => {
    collectionRepo.findByIdForUpdate.mockResolvedValueOnce({
      user: 'u1',
      items: [{ manga: 'm1' }],
    });
    mangaRepo.findById.mockResolvedValueOnce({ _id: 'm1' });
    collectionRepo.addItemIfMissing.mockResolvedValueOnce(null);

    await expect(collectionService.addItemToCollection('c1', 'u1', 'm1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('addItemToCollection returns updated collection when insert succeeds', async () => {
    collectionRepo.findByIdForUpdate.mockResolvedValueOnce({
      user: 'u1',
      items: [],
    });
    mangaRepo.findById.mockResolvedValueOnce({ _id: 'm1' });
    collectionRepo.addItemIfMissing.mockResolvedValueOnce({ _id: 'c1', items: [{ manga: 'm1' }] });

    const result = await collectionService.addItemToCollection('c1', 'u1', 'm1');

    expect(collectionRepo.addItemIfMissing).toHaveBeenCalledWith('c1', 'm1');
    expect(result.items).toHaveLength(1);
  });

  it('removeItemFromCollection throws 404 when item not found in collection', async () => {
    const save = jest.fn();
    const collection = {
      user: 'u1',
      items: [{ manga: 'm2' }],
      save,
    };
    collectionRepo.findByIdForUpdate.mockResolvedValueOnce(collection);

    await expect(collectionService.removeItemFromCollection('c1', 'u1', 'm1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('listCollections returns pagination meta', async () => {
    collectionRepo.findByUser.mockResolvedValueOnce([{ _id: 'c1' }]);
    collectionRepo.countByUser.mockResolvedValueOnce(1);

    const result = await collectionService.listCollections('u1', { page: 1, limit: 20 });

    expect(result.collections).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('getCollectionById returns collection for owner', async () => {
    collectionRepo.findById.mockResolvedValueOnce({ _id: 'c1', user: 'u1' });

    const result = await collectionService.getCollectionById('c1', 'u1');

    expect(result._id).toBe('c1');
  });

  it('getCollectionById rejects when not owner', async () => {
    collectionRepo.findById.mockResolvedValueOnce({ _id: 'c1', user: 'u2' });

    await expect(collectionService.getCollectionById('c1', 'u1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('updateCollection rejects when not owner', async () => {
    collectionRepo.findByIdForUpdate.mockResolvedValueOnce({ _id: 'c1', user: 'u2' });

    await expect(collectionService.updateCollection('c1', 'u1', { name: 'New Name' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deleteCollection returns deleted true for owner', async () => {
    collectionRepo.findByIdForUpdate.mockResolvedValueOnce({ _id: 'c1', user: 'u1' });
    collectionRepo.deleteById.mockResolvedValueOnce({ deletedCount: 1 });

    const result = await collectionService.deleteCollection('c1', 'u1');

    expect(result.deleted).toBe(true);
    expect(collectionRepo.deleteById).toHaveBeenCalledWith('c1');
  });

  it('getPublicCollectionById returns public collection', async () => {
    collectionRepo.findPublicById.mockResolvedValueOnce({ _id: 'c-public', visibility: 'public' });

    const result = await collectionService.getPublicCollectionById('c-public');

    expect(collectionRepo.findPublicById).toHaveBeenCalledWith('c-public');
    expect(result.visibility).toBe('public');
  });

  it('getPublicCollectionById throws 404 when collection is not public or missing', async () => {
    collectionRepo.findPublicById.mockResolvedValueOnce(null);

    await expect(collectionService.getPublicCollectionById('c-missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});
