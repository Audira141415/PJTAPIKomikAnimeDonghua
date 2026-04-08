'use strict';

jest.mock('../../src/modules/user/user.service');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const userService = require('../../src/modules/user/user.service');

function bearer(role = 'user') {
  const token = jwt.sign({ id: 'u1', role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

describe('user routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/users/:userId/profile returns public profile', async () => {
    userService.getPublicProfile.mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439012',
      username: 'public-user',
      displayName: 'Public User',
    });

    const res = await request(app)
      .get('/api/v1/users/507f1f77bcf86cd799439012/profile');

    expect(res.status).toBe(200);
    expect(userService.getPublicProfile).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
    expect(res.body.data.username).toBe('public-user');
  });

  it('GET /api/v1/users/:userId/stats returns public stats', async () => {
    userService.getPublicStats.mockResolvedValueOnce({
      reviews: 2,
      comments: 5,
      collections: { public: 1 },
    });

    const res = await request(app)
      .get('/api/v1/users/507f1f77bcf86cd799439012/stats');

    expect(res.status).toBe(200);
    expect(userService.getPublicStats).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
    expect(res.body.data.collections.public).toBe(1);
  });

  it('GET /api/v1/users/:userId/reviews returns public review feed', async () => {
    userService.getPublicReviewsByUser.mockResolvedValueOnce({
      reviews: [{ _id: 'r1', body: 'Great series' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    const res = await request(app)
      .get('/api/v1/users/507f1f77bcf86cd799439012/reviews')
      .query({ page: 1, limit: 20, sort: 'top' });

    expect(res.status).toBe(200);
    expect(userService.getPublicReviewsByUser).toHaveBeenCalledWith('507f1f77bcf86cd799439012', {
      page: 1,
      limit: 20,
      sort: 'top',
    });
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/v1/users/:userId/comments returns public lightweight activity feed', async () => {
    userService.getPublicCommentsByUser.mockResolvedValueOnce({
      comments: [{ _id: 'c1', body: 'Nice chapter!' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    const res = await request(app)
      .get('/api/v1/users/507f1f77bcf86cd799439012/comments')
      .query({ page: 1, limit: 20, sort: 'most_liked' });

    expect(res.status).toBe(200);
    expect(userService.getPublicCommentsByUser).toHaveBeenCalledWith('507f1f77bcf86cd799439012', {
      page: 1,
      limit: 20,
      sort: 'most_liked',
    });
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/v1/users/:userId/reviews rejects invalid limit', async () => {
    const res = await request(app)
      .get('/api/v1/users/507f1f77bcf86cd799439012/reviews')
      .query({ limit: 1000 });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/users/:userId/comments rejects invalid sort', async () => {
    const res = await request(app)
      .get('/api/v1/users/507f1f77bcf86cd799439012/comments')
      .query({ sort: 'top' });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/users/:userId/profile rejects invalid user id', async () => {
    const res = await request(app)
      .get('/api/v1/users/not-an-object-id/profile');

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/users/me still requires authentication', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/users/me returns current authenticated user', async () => {
    userService.getProfile.mockResolvedValueOnce({ _id: 'u1', username: 'me' });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(userService.getProfile).toHaveBeenCalledWith('u1');
  });
});
