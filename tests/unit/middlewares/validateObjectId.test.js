'use strict';

const { validateObjectId } = require('../../../src/middlewares/validateObjectId.middleware');
const ApiError = require('../../../src/shared/errors/ApiError');

const makeReq  = (params = {}) => ({ params });
const makeRes  = () => ({});
const makeNext = () => jest.fn();

describe('validateObjectId middleware', () => {
  const validId   = '507f1f77bcf86cd799439011';
  const invalidId = 'not-an-object-id';

  it('calls next() with no args when all params are valid ObjectIds', () => {
    const next = makeNext();
    validateObjectId('id')(makeReq({ id: validId }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(); // next() with no arguments
  });

  it('calls next(ApiError 400) when a param is an invalid ObjectId', () => {
    const next = makeNext();
    validateObjectId('id')(makeReq({ id: invalidId }), makeRes(), next);
    const [err] = next.mock.calls[0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('id');
  });

  // L-4: Empty strings are now caught (not optional). In Express routing,
  // path params are required anyway — you can't reach this middleware without
  // at least matching the route. This tests the empty string case.
  it('calls next(ApiError 400) when a param is an empty string (L-4 fix)', () => {
    const next = makeNext();
    validateObjectId('id')(makeReq({ id: '' }), makeRes(), next);
    const [err] = next.mock.calls[0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
  });

  it('validates multiple params and stops at first invalid', () => {
    const next = makeNext();
    validateObjectId('seriesId', 'episodeId')(
      makeReq({ seriesId: validId, episodeId: invalidId }),
      makeRes(),
      next,
    );
    const [err] = next.mock.calls[0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toContain('episodeId');
  });

  it('validates multiple valid params and calls next() with no args', () => {
    const next = makeNext();
    validateObjectId('seriesId', 'episodeId')(
      makeReq({ seriesId: validId, episodeId: '507f191e810c19729de860ea' }),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });
});
