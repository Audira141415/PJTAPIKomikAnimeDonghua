'use strict';

jest.mock('../../../src/modules/client-usage/clientUsage.service', () => ({
  resolveClientFromRequest: jest.fn(),
  logRequestUsage: jest.fn(),
}));

jest.mock('../../../src/config/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const mongoose = require('mongoose');
const { clientUsageTracker } = require('../../../src/middlewares/clientUsage.middleware');
const clientUsageService = require('../../../src/modules/client-usage/clientUsage.service');

describe('clientUsageTracker middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection.readyState = 1;
  });

  function makeReq(overrides = {}) {
    const headers = {
      origin: 'https://reader.example.com',
      referer: 'https://reader.example.com/page/1',
      'x-api-key': 'abcdef0123456789',
      'user-agent': 'jest-agent',
      ...overrides.headers,
    };

    return {
      method: 'GET',
      path: '/v1/mangas',
      baseUrl: '/api',
      originalUrl: '/api/v1/mangas?limit=1',
      id: 'req-1',
      ip: '10.0.0.22',
      headers,
      get: (key) => headers[key.toLowerCase()] || headers[key],
      ...overrides,
    };
  }

  function makeRes(overrides = {}) {
    const handlers = {};
    return {
      statusCode: 200,
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      __handlers: handlers,
      ...overrides,
    };
  }

  it('logs usage on finish event with resolved client', async () => {
    clientUsageService.resolveClientFromRequest.mockResolvedValueOnce({
      client: { _id: '507f1f77bcf86cd799439011', name: 'Reader App' },
      matchedBy: 'api-key',
    });
    clientUsageService.logRequestUsage.mockResolvedValueOnce(undefined);

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    clientUsageTracker(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(clientUsageService.resolveClientFromRequest).toHaveBeenCalledWith({
      apiKey: 'abcdef0123456789',
      originDomain: 'reader.example.com',
      refererDomain: 'reader.example.com',
    });

    await res.__handlers.finish();
    await new Promise((resolve) => setImmediate(resolve));

    expect(clientUsageService.logRequestUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        req,
        res,
        resolvedClient: expect.objectContaining({ name: 'Reader App' }),
        matchedBy: 'api-key',
        originDomain: 'reader.example.com',
        refererDomain: 'reader.example.com',
      })
    );
  });

  it('skips tracking for client-usage endpoints', () => {
    const req = makeReq({ path: '/v1/client-usage/reports/top-websites' });
    const res = makeRes();
    const next = jest.fn();

    clientUsageTracker(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(clientUsageService.resolveClientFromRequest).not.toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
  });

  it('does not write log when db is not connected', async () => {
    mongoose.connection.readyState = 0;
    clientUsageService.resolveClientFromRequest.mockResolvedValueOnce({ client: null, matchedBy: 'none' });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    clientUsageTracker(req, res, next);
    await res.__handlers.finish();
    await new Promise((resolve) => setImmediate(resolve));

    expect(clientUsageService.logRequestUsage).not.toHaveBeenCalled();
  });
});
