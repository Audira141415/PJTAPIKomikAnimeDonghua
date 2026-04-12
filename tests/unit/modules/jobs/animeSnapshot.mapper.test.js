'use strict';

const {
  normalizeSnapshotEnvelope,
  detectSnapshotKind,
  buildImportPlan,
} = require('../../../../src/modules/jobs/animeSnapshot.mapper');

describe('modules/jobs/animeSnapshot.mapper', () => {
  it('normalizes the outer envelope without losing pagination', () => {
    const snapshot = {
      status: 'success',
      creator: 'Sanka Vollerei',
        message: null,
      data: { animeList: [] },
      pagination: { currentPage: 1, totalPages: 2 },
    };

    expect(normalizeSnapshotEnvelope(snapshot)).toEqual({
      status: 'success',
      creator: 'Sanka Vollerei',
      message: null,
      data: { animeList: [] },
      pagination: { currentPage: 1, totalPages: 2 },
    });
  });

  it('detects collection, series, and episode snapshots', () => {
    expect(detectSnapshotKind({ animeList: [{ title: 'One Piece' }] })).toBe('collection');
    expect(detectSnapshotKind({ title: 'One Piece', episodeList: [{ title: 1 }] })).toBe('series-detail');
    expect(detectSnapshotKind({ title: 'One Piece Episode 1', server: {}, downloadUrl: {} })).toBe('episode-detail');
  });

  it('builds a collection import plan from home snapshots', () => {
    const plan = buildImportPlan(
      {
        status: 'success',
        data: {
          animeList: [
            {
              title: '  One Piece  ',
              poster: 'https://cdn.example.test/one-piece.jpg',
              type: 'TV',
              score: '8.73',
              status: 'Ongoing',
              animeId: 'one-piece',
              href: '/samehadaku/anime/one-piece',
              samehadakuUrl: 'https://example.test/anime/one-piece/',
              genreList: [{ title: 'Action' }, { title: 'Adventure' }],
            },
          ],
        },
      },
      { sourceKey: 'samehadaku', endpoint: '/samehadaku/home' },
    );

    expect(plan.kind).toBe('collection');
    expect(plan.mediaItems).toHaveLength(1);
    expect(plan.mediaItems[0]).toMatchObject({
      title: 'One Piece',
      slug: 'one-piece',
      type: 'anime',
      contentCategory: 'animation',
      status: 'ongoing',
      coverImage: 'https://cdn.example.test/one-piece.jpg',
      sourceKey: 'samehadaku',
      sourceId: 'one-piece',
      sourceUrl: 'https://example.test/anime/one-piece/',
    });
    expect(plan.mediaItems[0].genres).toEqual(['Action', 'Adventure']);
  });

  it('builds a series-detail plan with episode placeholders', () => {
    const plan = buildImportPlan(
      {
        status: 'success',
        data: {
          title: 'One Piece',
          animeId: 'one-piece',
          poster: 'https://cdn.example.test/one-piece.jpg',
          type: 'TV',
          status: 'Ongoing',
          episodeList: [
            { title: 1141, episodeId: 'one-piece-episode-1141', samehadakuUrl: 'https://example.test/one-piece-episode-1141/' },
          ],
        },
      },
      { sourceKey: 'samehadaku', endpoint: '/samehadaku/anime/one-piece' },
    );

    expect(plan.kind).toBe('series-detail');
    expect(plan.mediaItems).toHaveLength(1);
    expect(plan.episodes).toHaveLength(1);
    expect(plan.episodes[0]).toMatchObject({
      episodeNumber: 1141,
      slug: 'one-piece-episode-1141',
      sourceKey: 'samehadaku',
      sourceId: 'one-piece-episode-1141',
      sourceUrl: 'https://example.test/one-piece-episode-1141/',
    });
  });
});