'use strict';

jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/review.repository', () => ({
  findByUserPublic: jest.fn(),
  countByUser: jest.fn(),
}));
jest.mock('../../../src/repositories/comment.repository', () => ({
  findByUserPublic: jest.fn(),
  countByUser: jest.fn(),
}));
jest.mock('../../../src/shared/utils/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/models', () => ({
  Review: { countDocuments: jest.fn() },
  Comment: { countDocuments: jest.fn() },
  Collection: { countDocuments: jest.fn() },
}));

const userRepo = require('../../../src/repositories/user.repository');
const reviewRepo = require('../../../src/repositories/review.repository');
const commentRepo = require('../../../src/repositories/comment.repository');
const cache = require('../../../src/shared/utils/cache');
const userService = require('../../../src/modules/user/user.service');
const { Review, Comment, Collection } = require('../../../src/models');

describe('user.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.get.mockResolvedValue(null);
  });

  it('getProfile returns user when found', async () => {
    userRepo.findById.mockResolvedValueOnce({ _id: 'u1' });
    const result = await userService.getProfile('u1');
    expect(result).toEqual({ _id: 'u1' });
  });

  it('getProfile throws 404 when not found', async () => {
    userRepo.findById.mockResolvedValueOnce(null);
    await expect(userService.getProfile('u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updateProfile only persists allowed fields', async () => {
    userRepo.updateById.mockResolvedValueOnce({ _id: 'u1', username: 'new', bio: 'b' });

    await userService.updateProfile('u1', {
      username: 'new',
      bio: 'b',
      role: 'admin',
      email: 'should-not-change@example.com',
    });

    expect(userRepo.updateById).toHaveBeenCalledWith('u1', {
      username: 'new',
      bio: 'b',
    });
  });

  it('updateAvatar updates avatar field', async () => {
    userRepo.updateById.mockResolvedValueOnce({ _id: 'u1', avatar: 'x.png' });
    const result = await userService.updateAvatar('u1', 'x.png');
    expect(userRepo.updateById).toHaveBeenCalledWith('u1', { avatar: 'x.png' });
    expect(result.avatar).toBe('x.png');
  });

  it('getPublicProfile returns safe public user payload', async () => {
    userRepo.findPublicById.mockResolvedValueOnce({ _id: 'u2', username: 'public-user' });

    const result = await userService.getPublicProfile('u2');

    expect(userRepo.findPublicById).toHaveBeenCalledWith('u2');
    expect(result.username).toBe('public-user');
  });

  it('getPublicStats returns aggregated user activity counts', async () => {
    userRepo.findPublicById.mockResolvedValueOnce({ _id: 'u2', username: 'public-user' });
    Review.countDocuments.mockResolvedValueOnce(2);
    Comment.countDocuments.mockResolvedValueOnce(5);
    Collection.countDocuments.mockResolvedValueOnce(1);

    const result = await userService.getPublicStats('u2');

    expect(result.reviews).toBe(2);
    expect(result.comments).toBe(5);
    expect(result.collections).toEqual({ public: 1 });
  });

  it('getPublicReviewsByUser returns paginated public reviews feed', async () => {
    userRepo.findPublicById.mockResolvedValueOnce({ _id: 'u2' });
    reviewRepo.findByUserPublic.mockResolvedValueOnce([{ _id: 'r1' }]);
    reviewRepo.countByUser.mockResolvedValueOnce(1);

    const result = await userService.getPublicReviewsByUser('u2', { page: 1, limit: 20, sort: 'top' });

    expect(reviewRepo.findByUserPublic).toHaveBeenCalledWith({ userId: 'u2', skip: 0, limit: 20, sort: 'top' });
    expect(result.reviews).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('getPublicCommentsByUser returns paginated public comments feed', async () => {
    userRepo.findPublicById.mockResolvedValueOnce({ _id: 'u2' });
    commentRepo.findByUserPublic.mockResolvedValueOnce([{ _id: 'c1' }]);
    commentRepo.countByUser.mockResolvedValueOnce(1);

    const result = await userService.getPublicCommentsByUser('u2', { page: 1, limit: 20, sort: 'most_liked' });

    expect(commentRepo.findByUserPublic).toHaveBeenCalledWith({ userId: 'u2', skip: 0, limit: 20, sort: 'most_liked' });
    expect(result.comments).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});
