'use strict';

jest.mock('../../../../src/models', () => ({
  Manga: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  },
  Chapter: {},
  Tag: {},
  Bookmark: {},
  Review: {},
}));

jest.mock('../../../../src/shared/utils/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('../../../../src/shared/utils/catchAsync', () => (fn) => fn);

jest.mock('../../../../src/shared/utils/response', () => ({
  success: jest.fn((res, payload) => res.json(payload)),
}));

const { Manga } = require('../../../../src/models');
const cache = require('../../../../src/shared/utils/cache');
const controller = require('../../../../src/modules/comic/comic.controller');

describe('modules/comic/comic.controller stats', () => {
  beforeEach(() => {
    Manga.countDocuments.mockReset();
    Manga.aggregate.mockReset();
    Manga.find.mockReset();
    cache.get.mockReset();
    cache.set.mockReset();
    cache.get.mockResolvedValue(null);
  });

  it('serves cached stats without re-running aggregates', async () => {
    const cachedPayload = {
      data: {
        total: 1,
        animationTotal: 1,
        animationSources: 1,
        animationByNetwork: { samehadaku: 1 },
        sourceBreakdown: {
          animeSources: [],
          donghuaSources: [],
          mangaSources: [],
          topSources: [],
        },
      },
    };
    cache.get.mockResolvedValueOnce(cachedPayload);

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.stats({}, res);

    expect(Manga.aggregate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(cachedPayload);
  });

  it('returns total animation count and per-source breakdown', async () => {
    Manga.countDocuments.mockResolvedValueOnce(10);
    Manga.aggregate
      .mockResolvedValueOnce([
        { _id: 'anime', count: 2 },
        { _id: 'donghua', count: 6 },
      ])
      .mockResolvedValueOnce([
        { _id: 'ongoing', count: 9 },
        { _id: 'completed', count: 1 },
      ])
      .mockResolvedValueOnce([
        { _id: 'samehadaku', count: 3 },
        { _id: 'oploverz', count: 2 },
        { _id: 'animasu', count: 1 },
      ])
      .mockResolvedValueOnce([
        { total: 6 },
      ])
      .mockResolvedValueOnce([
        { _id: 'samehadaku', total: 3 },
        { _id: 'oploverz', total: 2 },
        { _id: 'animasu', total: 1 },
      ])
      .mockResolvedValueOnce([
        { _id: { network: 'samehadaku', type: 'anime', contentCategory: 'animation' }, count: 3 },
        { _id: { network: 'oploverz', type: 'donghua', contentCategory: 'animation' }, count: 2 },
        { _id: { network: 'animasu', type: 'anime', contentCategory: 'animation' }, count: 1 },
      ]);

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.stats({}, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        total: 10,
        animationTotal: 6,
        animationSources: 3,
        animationByNetwork: {
          samehadaku: 3,
          oploverz: 2,
          animasu: 1,
        },
        sourceBreakdown: expect.objectContaining({
          animeSources: expect.arrayContaining([
            expect.objectContaining({ source: 'samehadaku', total: 3 }),
          ]),
          donghuaSources: expect.arrayContaining([
            expect.objectContaining({ source: 'oploverz', total: 2 }),
          ]),
          topSources: expect.arrayContaining([
            expect.objectContaining({ source: 'samehadaku', total: 3 }),
          ]),
        }),
      }),
    }));
  });

  it('returns distribution rows with source options', async () => {
    Manga.countDocuments.mockResolvedValueOnce(10);
    Manga.aggregate
      .mockResolvedValueOnce([
        {
          _id: { network: 'samehadaku', type: 'anime' },
          count: 3,
          confidenceSum: 2.7,
          confidenceCount: 3,
        },
      ])
      .mockResolvedValueOnce([
        { _id: 'anime', count: 3 },
      ])
      .mockResolvedValueOnce([
        {
          _id: { network: 'samehadaku', type: 'anime' , reason: 'type:anime' },
          count: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: 'samehadaku',
          topRule: 'type:anime',
          topRuleCount: 3,
        },
      ])
      .mockResolvedValueOnce([
        { _id: 'samehadaku' },
      ])
      .mockResolvedValueOnce([
        { _id: 'anime' },
      ]);

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.statsDistribution({ query: {} }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalNetworks: 1,
        byType: { anime: 3 },
        byNetwork: [
          expect.objectContaining({
            network: 'samehadaku',
            total: 3,
            byType: { anime: 3 },
            avgConfidence: 0.9,
            topRule: 'type:anime',
          }),
        ],
        options: expect.objectContaining({
          availableNetworks: ['samehadaku'],
          availableTypes: ['anime'],
        }),
      }),
    }));
  });

  it('exposes overview animation total and per-source breakdown', async () => {
    Manga.countDocuments.mockResolvedValueOnce(10);
    Manga.aggregate
      .mockResolvedValueOnce([{ _id: 'anime', count: 2 }])
      .mockResolvedValueOnce([{ _id: 'ongoing', count: 10 }])
      .mockResolvedValueOnce([
        { _id: 'samehadaku', count: 3 },
        { _id: 'oploverz', count: 2 },
      ])
      .mockResolvedValueOnce([{ total: 5 }])
      .mockResolvedValueOnce([
        { _id: 'samehadaku', total: 3 },
        { _id: 'oploverz', total: 2 },
      ])
      .mockResolvedValueOnce([
        { _id: { network: 'samehadaku', type: 'anime', contentCategory: 'animation' }, count: 3 },
        { _id: { network: 'oploverz', type: 'donghua', contentCategory: 'animation' }, count: 2 },
      ]);

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.stats({}, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        animationTotal: 5,
        animationSources: 2,
        animationByNetwork: {
          samehadaku: 3,
          oploverz: 2,
        },
        sourceBreakdown: expect.objectContaining({
          animeSources: expect.arrayContaining([
            expect.objectContaining({ source: 'samehadaku', total: 3 }),
          ]),
          donghuaSources: expect.arrayContaining([
            expect.objectContaining({ source: 'oploverz', total: 2 }),
          ]),
          mangaSources: expect.any(Array),
          topSources: expect.any(Array),
        }),
      }),
    }));
  });

  it('returns empty breakdown arrays when no source rows exist', async () => {
    Manga.countDocuments.mockResolvedValueOnce(0);
    Manga.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.stats({}, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        animationTotal: 0,
        animationSources: 0,
        sourceBreakdown: expect.objectContaining({
          animeSources: [],
          donghuaSources: [],
          mangaSources: [],
          topSources: [],
        }),
      }),
    }));
  });

  it('returns titles and ratings for selected source in statsSourceItems', async () => {
    Manga.aggregate
      .mockResolvedValueOnce([
        { _id: 'samehadaku', total: 2, avgRating: 8.25 },
        { _id: 'anichin', total: 1, avgRating: 7.8 },
      ])
      .mockResolvedValueOnce([
        {
          title: 'Solo Leveling',
          slug: 'solo-leveling',
          type: 'anime',
          rating: 8.9,
          views: 1200,
          status: 'ongoing',
          network: 'samehadaku',
          source: 'samehadaku',
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.statsSourceItems({ query: { source: 'samehadaku', category: 'animation', page: '1', limit: '20' } }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({
          title: 'Solo Leveling',
          rating: 8.9,
          source: 'samehadaku',
        }),
      ]),
      meta: expect.objectContaining({
        selectedSource: 'samehadaku',
        category: 'animation',
      }),
    }));
  });

  it('matches source items by sourceKey fallback when network is empty', async () => {
    Manga.aggregate
      .mockResolvedValueOnce([
        { _id: 'mangadex', total: 1, avgRating: 8.1 },
      ])
      .mockResolvedValueOnce([
        {
          title: 'One Piece',
          slug: 'one-piece',
          type: 'manga',
          rating: 8.1,
          views: 700,
          status: 'ongoing',
          network: null,
          sourceKey: 'mangadex',
          source: 'mangadex',
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.statsSourceItems({ query: { source: 'mangadex', category: 'comic' } }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({
          title: 'One Piece',
          source: 'mangadex',
        }),
      ]),
      meta: expect.objectContaining({
        selectedSource: 'mangadex',
      }),
    }));
  });
});