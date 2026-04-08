'use strict';

jest.mock('../../src/modules/collection/collection.service');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const collectionService = require('../../src/modules/collection/collection.service');

function bearer(role = 'user') {
  const token = jwt.sign({ id: 'u1', role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

describe('collection routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/v1/collections blocks unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/v1/collections')
      .send({ name: 'Favorites' });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/collections creates collection', async () => {
    collectionService.createCollection.mockResolvedValueOnce({ _id: 'c1', name: 'Favorites' });

    const res = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', bearer())
      .send({ name: 'Favorites', visibility: 'private' });

    expect(res.status).toBe(201);
    expect(collectionService.createCollection).toHaveBeenCalledWith('u1', {
      name: 'Favorites',
      description: '',
      visibility: 'private',
    });
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/collections returns user collections', async () => {
    collectionService.listCollections.mockResolvedValueOnce({
      collections: [{ _id: 'c1', name: 'Favorites' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    const res = await request(app)
      .get('/api/v1/collections')
      .set('Authorization', bearer())
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(collectionService.listCollections).toHaveBeenCalledWith('u1', { page: 1, limit: 20 });
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/v1/collections/:collectionId returns collection by id', async () => {
    collectionService.getCollectionById.mockResolvedValueOnce({ _id: 'c1', name: 'Favorites' });

    const res = await request(app)
      .get('/api/v1/collections/507f1f77bcf86cd799439012')
      .set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(collectionService.getCollectionById).toHaveBeenCalledWith('507f1f77bcf86cd799439012', 'u1');
  });

  it('PATCH /api/v1/collections/:collectionId updates collection', async () => {
    collectionService.updateCollection.mockResolvedValueOnce({ _id: 'c1', name: 'Updated Favorites' });

    const res = await request(app)
      .patch('/api/v1/collections/507f1f77bcf86cd799439012')
      .set('Authorization', bearer())
      .send({ name: 'Updated Favorites' });

    expect(res.status).toBe(200);
    expect(collectionService.updateCollection).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      'u1',
      { name: 'Updated Favorites' }
    );
  });

  it('DELETE /api/v1/collections/:collectionId deletes collection', async () => {
    collectionService.deleteCollection.mockResolvedValueOnce({ deleted: true });

    const res = await request(app)
      .delete('/api/v1/collections/507f1f77bcf86cd799439012')
      .set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(collectionService.deleteCollection).toHaveBeenCalledWith('507f1f77bcf86cd799439012', 'u1');
  });

  it('POST /api/v1/collections/:collectionId/items adds manga to collection', async () => {
    collectionService.addItemToCollection.mockResolvedValueOnce({ _id: 'c1', items: [{ manga: '507f1f77bcf86cd799439011' }] });

    const res = await request(app)
      .post('/api/v1/collections/507f1f77bcf86cd799439012/items')
      .set('Authorization', bearer())
      .send({ mangaId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(200);
    expect(collectionService.addItemToCollection).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      'u1',
      '507f1f77bcf86cd799439011'
    );
  });

  it('DELETE /api/v1/collections/:collectionId/items/:mangaId removes manga from collection', async () => {
    collectionService.removeItemFromCollection.mockResolvedValueOnce({ _id: 'c1', items: [] });

    const res = await request(app)
      .delete('/api/v1/collections/507f1f77bcf86cd799439012/items/507f1f77bcf86cd799439011')
      .set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(collectionService.removeItemFromCollection).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      'u1',
      '507f1f77bcf86cd799439011'
    );
  });

  it('GET /api/v1/collections/:collectionId rejects invalid collection id', async () => {
    const res = await request(app)
      .get('/api/v1/collections/not-an-object-id')
      .set('Authorization', bearer());

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/collections/:collectionId/items rejects invalid mangaId body', async () => {
    const res = await request(app)
      .post('/api/v1/collections/507f1f77bcf86cd799439012/items')
      .set('Authorization', bearer())
      .send({ mangaId: 'invalid-id' });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/users/:userId/collections returns public collections', async () => {
    collectionService.listPublicCollectionsByUser.mockResolvedValueOnce({
      collections: [{ _id: 'c-public', name: 'Public Favorites', visibility: 'public' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    const res = await request(app)
      .get('/api/v1/users/507f1f77bcf86cd799439012/collections')
      .query({ visibility: 'public', page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(collectionService.listPublicCollectionsByUser).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      { visibility: 'public', page: 1, limit: 20 }
    );
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/v1/users/:userId/collections rejects invalid user id', async () => {
    const res = await request(app)
      .get('/api/v1/users/invalid-user-id/collections')
      .query({ visibility: 'public' });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/collections/public/trending returns public discovery payload', async () => {
    collectionService.getPublicTrendingCollections.mockResolvedValueOnce({
      collections: [{ _id: 'c1', name: 'Top Collection', itemsCount: 10 }],
      meta: { limit: 10, count: 1 },
    });

    const res = await request(app)
      .get('/api/v1/collections/public/trending')
      .query({ limit: 10 });

    expect(res.status).toBe(200);
    expect(collectionService.getPublicTrendingCollections).toHaveBeenCalledWith({ limit: 10 });
    expect(res.body.meta.count).toBe(1);
  });

  it('GET /api/v1/collections/public/:collectionId returns public collection detail', async () => {
    collectionService.getPublicCollectionById.mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439012',
      name: 'Public Collection',
      visibility: 'public',
    });

    const res = await request(app)
      .get('/api/v1/collections/public/507f1f77bcf86cd799439012');

    expect(res.status).toBe(200);
    expect(collectionService.getPublicCollectionById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
    expect(res.body.data.visibility).toBe('public');
  });

  it('GET /api/v1/collections/public/:collectionId rejects invalid id', async () => {
    const res = await request(app)
      .get('/api/v1/collections/public/not-an-object-id');

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/collections/public/trending rejects invalid limit', async () => {
    const res = await request(app)
      .get('/api/v1/collections/public/trending')
      .query({ limit: 200 });

    expect(res.status).toBe(400);
  });
});
