'use strict';

const { paginate, paginateMeta } = require('../../../src/shared/utils/paginate');

describe('shared/utils/paginate', () => {
  it('applies sane defaults for invalid values', () => {
    const result = paginate(undefined, undefined);
    expect(result).toEqual({ skip: 0, limit: 20, page: 1 });
  });

  it('caps page and limit', () => {
    const result = paginate('999999', '1000');
    expect(result.page).toBe(10000);
    expect(result.limit).toBe(100);
  });

  it('builds pagination metadata', () => {
    const meta = paginateMeta(95, 2, 20);
    expect(meta).toEqual({ total: 95, page: 2, limit: 20, totalPages: 5 });
  });
});
