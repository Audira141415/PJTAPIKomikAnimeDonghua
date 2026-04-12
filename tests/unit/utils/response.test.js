'use strict';

const { success, error } = require('../../../src/shared/utils/response');

const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('shared/utils/response', () => {
  describe('success()', () => {
    it('sends 200 with data and ok:true by default', () => {
      const res = makeRes();
      success(res, { data: { id: 1 } });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          success: true,
          error: null,
          meta: null,
          ok: true,
          statusCode: 200,
          data: { id: 1 },
          pagination: null,
        }),
      );
    });

    it('forwards custom statusCode and pagination', () => {
      const res = makeRes();
      const pagination = { page: 1, limit: 20, total: 100 };
      success(res, { statusCode: 201, data: [], pagination });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 201, meta: pagination, pagination }),
      );
    });

    it('normalizes creator fields inside data objects', () => {
      const res = makeRes();
      success(res, { data: { creator: 'someone' } });

      const payload = res.json.mock.calls[0][0];
      // creator inside data should be replaced with the SITE_CREATOR env value
      expect(payload.data.creator).toBeDefined();
    });

    it('handles array data without throwing', () => {
      const res = makeRes();
      success(res, { data: [{ id: 1 }, { id: 2 }] });

      const payload = res.json.mock.calls[0][0];
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data).toHaveLength(2);
    });

    it('handles null data', () => {
      const res = makeRes();
      success(res, { data: null });

      const payload = res.json.mock.calls[0][0];
      expect(payload.data).toBeNull();
    });

    it('accepts non-plain toJSON objects and normalizes them', () => {
      const res = makeRes();
      // Use a class instance so isPlainObject returns false and toJSON branch fires
      class Model {
        toJSON() { return { id: 42, name: 'test' }; }
      }
      success(res, { data: new Model() });

      const payload = res.json.mock.calls[0][0];
      expect(payload.data).toEqual({ id: 42, name: 'test' });
    });

    it('handles Date values without transforming them', () => {
      const now = new Date();
      const res = makeRes();
      success(res, { data: { createdAt: now } });

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.createdAt).toBeInstanceOf(Date);
    });

    it('exposes a normalized error envelope', () => {
      const res = makeRes();
      error(res, { statusCode: 404, message: 'Not Found' });

      const payload = res.json.mock.calls[0][0];
      expect(payload.status).toBe('error');
      expect(payload.success).toBe(false);
      expect(payload.error).toEqual({ code: 'not_found', message: 'Not Found', statusCode: 404 });
      expect(payload.meta).toBeNull();
    });

    it('does not recurse into circular objects', () => {
      const res = makeRes();
      const obj = {};
      obj.self = obj; // circular reference
      // Should not throw (seen WeakSet prevents infinite loop)
      expect(() => success(res, { data: obj })).not.toThrow();
    });

    it('falls back to "OK" for unknown statusCode', () => {
      const res = makeRes();
      success(res, { statusCode: 299 });

      const payload = res.json.mock.calls[0][0];
      expect(payload.statusMessage).toBe('OK');
    });
  });

  describe('error()', () => {
    it('sends 500 with ok:false by default', () => {
      const res = makeRes();
      error(res, { statusCode: 500, message: 'Internal Server Error' });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          ok: false,
          error: expect.objectContaining({ code: 'internal_server_error' }),
          statusCode: 500,
          data: null,
          pagination: null,
        }),
      );
    });

    it('forwards custom statusCode and message', () => {
      const res = makeRes();
      error(res, { statusCode: 404, message: 'Not Found' });

      const payload = res.json.mock.calls[0][0];
      expect(payload.statusCode).toBe(404);
      expect(payload.message).toBe('Not Found');
    });

    it('uses fallback statusMessage for unmapped codes', () => {
      const res = makeRes();
      error(res, { statusCode: 418 });

      const payload = res.json.mock.calls[0][0];
      expect(payload.statusMessage).toBe('Error');
    });
  });
});
