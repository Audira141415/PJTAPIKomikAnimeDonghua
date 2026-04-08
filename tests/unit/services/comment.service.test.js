'use strict';

jest.mock('../../../src/repositories/comment.repository');
jest.mock('../../../src/shared/utils/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
}));

const commentRepo = require('../../../src/repositories/comment.repository');
const cache = require('../../../src/shared/utils/cache');
const commentService = require('../../../src/modules/comment/comment.service');

describe('comment.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('postComment maps fields correctly', async () => {
    commentRepo.create.mockResolvedValueOnce({ _id: 'c1' });

    await commentService.postComment({
      userId: 'u1',
      seriesId: 's1',
      chapterId: 'ch1',
      episodeId: null,
      body: 'nice',
      parentCommentId: null,
    });

    expect(commentRepo.create).toHaveBeenCalledWith({
      user: 'u1',
      series: 's1',
      chapter: 'ch1',
      episode: null,
      parentComment: null,
      body: 'nice',
    });
  });

  it('getCommentsBySeries returns paginated payload', async () => {
    commentRepo.findBySeries.mockResolvedValueOnce([{ _id: 'c1' }]);
    commentRepo.countBySeries.mockResolvedValueOnce(1);

    const result = await commentService.getCommentsBySeries({ seriesId: 's1', page: 1, limit: 20 });

    expect(result.comments).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('deleteComment rejects non-owner non-admin', async () => {
    commentRepo.findById.mockResolvedValueOnce({ user: { equals: () => false } });

    await expect(commentService.deleteComment('c1', 'u1', 'user')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('toggleLike throws 404 when comment not found', async () => {
    commentRepo.toggleLike.mockResolvedValueOnce(null);
    await expect(commentService.toggleLike('c1', 'u1')).rejects.toMatchObject({ statusCode: 404 });
    expect(cache.del).not.toHaveBeenCalled();
    expect(cache.delPattern).not.toHaveBeenCalled();
  });

  it('toggleLike invalidates public user cache for comment owner', async () => {
    commentRepo.toggleLike.mockResolvedValueOnce({ _id: 'c1', user: 'u2', likes: 3 });

    const result = await commentService.toggleLike('c1', 'u1');

    expect(result).toEqual({ _id: 'c1', user: 'u2', likes: 3 });
    expect(commentRepo.toggleLike).toHaveBeenCalledWith('c1', 'u1');
    expect(cache.del).toHaveBeenCalledWith('public:user:stats:u2');
    expect(cache.delPattern).toHaveBeenCalledWith('public:user:comments:u2:*');
  });

  it('toggleLike still succeeds when cache invalidation fails', async () => {
    commentRepo.toggleLike.mockResolvedValueOnce({ _id: 'c1', user: 'u2', likes: 4 });
    cache.del.mockRejectedValueOnce(new Error('redis down'));

    const result = await commentService.toggleLike('c1', 'u1');

    expect(result).toEqual({ _id: 'c1', user: 'u2', likes: 4 });
    expect(commentRepo.toggleLike).toHaveBeenCalledWith('c1', 'u1');
  });
});
