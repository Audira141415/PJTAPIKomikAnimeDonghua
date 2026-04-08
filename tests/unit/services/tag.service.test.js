'use strict';

jest.mock('../../../src/repositories/tag.repository');

const tagRepo = require('../../../src/repositories/tag.repository');
const tagService = require('../../../src/modules/tag/tag.service');

describe('tag.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listTags delegates to repository', async () => {
    tagRepo.findAll.mockResolvedValueOnce([{ name: 'Action' }]);
    const result = await tagService.listTags({ page: 1, limit: 10 });
    expect(tagRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result).toEqual([{ name: 'Action' }]);
  });

  it('getTag throws 404 when not found', async () => {
    tagRepo.findBySlug.mockResolvedValueOnce(null);
    await expect(tagService.getTag('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('createTag throws 409 when slug exists', async () => {
    tagRepo.findBySlug.mockResolvedValueOnce({ _id: 't1' });
    await expect(tagService.createTag({ name: 'Action' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('createTag creates new tag when slug is free', async () => {
    tagRepo.findBySlug.mockResolvedValueOnce(null);
    tagRepo.create.mockResolvedValueOnce({ _id: 't1', name: 'Action' });

    const result = await tagService.createTag({ name: 'Action' });

    expect(tagRepo.findBySlug).toHaveBeenCalledWith('action');
    expect(tagRepo.create).toHaveBeenCalledWith({ name: 'Action' });
    expect(result).toMatchObject({ name: 'Action' });
  });

  it('updateTag throws 404 when id not found', async () => {
    tagRepo.updateById.mockResolvedValueOnce(null);
    await expect(tagService.updateTag('x', { name: 'New' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteTag throws 404 when id not found', async () => {
    tagRepo.deleteById.mockResolvedValueOnce(null);
    await expect(tagService.deleteTag('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});
