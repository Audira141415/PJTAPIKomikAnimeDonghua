'use strict';

jest.mock('../../../../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../../../src/models/SourceFeed', () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../../../../src/models/SyncRun', () => ({
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../../../src/models/RawSnapshot', () => ({
  create: jest.fn(),
}));

jest.mock('../../../../src/models/Manga', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../../src/models/Season', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../../src/models/Episode', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const User = require('../../../../src/models/User');
const SourceFeed = require('../../../../src/models/SourceFeed');
const SyncRun = require('../../../../src/models/SyncRun');
const RawSnapshot = require('../../../../src/models/RawSnapshot');
const Manga = require('../../../../src/models/Manga');
const Season = require('../../../../src/models/Season');
const Episode = require('../../../../src/models/Episode');
const animeSyncService = require('../../../../src/modules/jobs/animeSync.service');

describe('modules/jobs/animeSync.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue({ _id: 'admin-1' });
    SourceFeed.findOneAndUpdate.mockResolvedValue({ _id: 'source-1' });
    SyncRun.create.mockResolvedValue({ _id: 'run-1' });
    SyncRun.findByIdAndUpdate.mockResolvedValue({ _id: 'run-1' });
    RawSnapshot.create.mockResolvedValue({ _id: 'snapshot-1' });
    Manga.findOne.mockResolvedValue(null);
    Manga.create.mockResolvedValue({ _id: 'manga-1', slug: 'one-piece' });
    Season.findOne.mockResolvedValue(null);
    Season.create.mockResolvedValue({ _id: 'season-1' });
    Episode.findOne.mockResolvedValue(null);
    Episode.create.mockResolvedValue({ _id: 'episode-1' });
  });

  it('syncAnimeSnapshot persists a collection snapshot into the canonical media collection', async () => {
    const result = await animeSyncService.syncAnimeSnapshot(
      {
        status: 'success',
        data: {
          animeList: [
            {
              title: 'One Piece',
              poster: 'https://cdn.example.test/one-piece.jpg',
              type: 'TV',
              score: '8.73',
              status: 'Ongoing',
              animeId: 'one-piece',
              href: '/samehadaku/anime/one-piece',
              samehadakuUrl: 'https://example.test/anime/one-piece/',
              genreList: [{ title: 'Action' }],
            },
          ],
        },
      },
      { sourceKey: 'samehadaku', endpoint: '/samehadaku/home', source: { key: 'samehadaku', name: 'Samehadaku', baseUrl: 'https://api.example.test' } },
    );

    expect(SourceFeed.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'samehadaku' },
      expect.objectContaining({
        $set: expect.objectContaining({
          key: 'samehadaku',
          name: 'Samehadaku',
        }),
      }),
      expect.objectContaining({ upsert: true, new: true, setDefaultsOnInsert: true }),
    );
    expect(RawSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
      sourceKey: 'samehadaku',
      endpoint: '/samehadaku/home',
      snapshotKind: 'collection',
    }));
    expect(Manga.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'One Piece',
      slug: 'one-piece',
      sourceKey: 'samehadaku',
      sourceId: 'one-piece',
    }));
    expect(SyncRun.findByIdAndUpdate).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'success' }),
      }),
      expect.any(Object),
    );
    expect(result).toMatchObject({
      source: 'samehadaku',
      fetched: 1,
      mapped: 1,
      uniqueDocs: 1,
    });
  });

  it('syncAnimeSnapshot persists episode detail snapshots into episode collections', async () => {
    const result = await animeSyncService.syncAnimeSnapshot(
      {
        status: 'success',
        data: {
          title: 'One Piece Episode 1141 Sub Indo',
          animeId: 'one-piece',
          poster: 'https://cdn.example.test/one-piece-ep.jpg',
          defaultStreamingUrl: 'https://stream.example.test/episode-1141',
          server: {
            qualities: [
              { title: '360p', serverList: [{ title: 'Blogspot 360p', serverId: 'srv-1', href: '/server/srv-1' }] },
            ],
          },
          downloadUrl: {
            formats: [],
          },
        },
      },
      { sourceKey: 'samehadaku', endpoint: '/samehadaku/episode/one-piece-episode-1141', source: { key: 'samehadaku', name: 'Samehadaku', baseUrl: 'https://api.example.test' } },
    );

    expect(RawSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
      snapshotKind: 'episode-detail',
      endpoint: '/samehadaku/episode/one-piece-episode-1141',
    }));
    expect(Episode.create).toHaveBeenCalledWith(expect.objectContaining({
      episodeNumber: 1141,
      title: 'One Piece Episode 1141 Sub Indo',
      sourceKey: 'samehadaku',
      sourceId: 'one-piece-episode-1141',
    }));
    expect(SyncRun.findByIdAndUpdate).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'success' }),
      }),
      expect.any(Object),
    );
    expect(result).toMatchObject({
      source: 'samehadaku',
      uniqueDocs: 3,
    });
  });
});