'use strict';

const catchAsync = require('../../../src/shared/utils/catchAsync');

describe('shared/utils/catchAsync', () => {
  it('calls the wrapped function with req, res, next', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const req = {};
    const res = {};
    const next = jest.fn();

    await catchAsync(fn)(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with the error when the wrapped function rejects', async () => {
    const err = new Error('something failed');
    const fn = jest.fn().mockRejectedValue(err);
    const req = {};
    const res = {};
    const next = jest.fn();

    await catchAsync(fn)(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('returns undefined (fire-and-forget async handling)', () => {
    const fn = jest.fn().mockResolvedValue('ignored');
    const req = {};
    const res = {};
    const next = jest.fn();

    // The wrapper itself returns undefined — Promise handling is internal
    const result = catchAsync(fn)(req, res, next);
    expect(result).toBeUndefined();
  });
});
