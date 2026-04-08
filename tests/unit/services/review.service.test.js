'use strict';

jest.mock('../../../src/repositories/review.repository');

const reviewRepo = require('../../../src/repositories/review.repository');
const reviewService = require('../../../src/modules/review/review.service');

describe('review.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createReview rejects duplicate user review', async () => {
    reviewRepo.findByUserAndSeries.mockResolvedValueOnce({ _id: 'r1' });
    await expect(reviewService.createReview({ userId: 'u1', seriesId: 's1', body: 'good', score: 8 }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('createReview stores a new review', async () => {
    reviewRepo.findByUserAndSeries.mockResolvedValueOnce(null);
    reviewRepo.create.mockResolvedValueOnce({ _id: 'r1' });

    await reviewService.createReview({ userId: 'u1', seriesId: 's1', body: 'good', score: 8 });

    expect(reviewRepo.create).toHaveBeenCalledWith({ user: 'u1', series: 's1', body: 'good', score: 8 });
  });

  it('getReviewsBySeries returns paginated payload', async () => {
    reviewRepo.findBySeries.mockResolvedValueOnce([{ _id: 'r1' }]);
    reviewRepo.countBySeries.mockResolvedValueOnce(1);

    const result = await reviewService.getReviewsBySeries({ seriesId: 's1', page: 1, limit: 20 });

    expect(result.reviews).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('updateReview rejects non-owner', async () => {
    reviewRepo.findById.mockResolvedValueOnce({ user: { equals: () => false } });
    await expect(reviewService.updateReview('r1', 'u1', { body: 'x' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deleteReview allows admin', async () => {
    reviewRepo.findById.mockResolvedValueOnce({ user: { equals: () => false } });
    reviewRepo.deleteById.mockResolvedValueOnce({ _id: 'r1' });

    const result = await reviewService.deleteReview('r1', 'u1', 'admin');

    expect(reviewRepo.deleteById).toHaveBeenCalledWith('r1');
    expect(result).toMatchObject({ _id: 'r1' });
  });
});
