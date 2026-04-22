'use strict';

const {
  normalizeSourceKeyFromDir,
  isLikelySnapshotDir,
  buildEndpointFromFile,
} = require('../../../../apps/worker-scrapers/animeSnapshotImport.helpers');

describe('modules/jobs/animeSnapshotImport.helpers', () => {
  it('normalizes known source directory names into stable source keys', () => {
    expect(normalizeSourceKeyFromDir('samehadaku')).toBe('samehadaku');
    expect(normalizeSourceKeyFromDir('AnimeSail API Endpoints')).toBe('animesail');
    expect(normalizeSourceKeyFromDir('Animekuindo API Endpoints')).toBe('animekuindo');
    expect(normalizeSourceKeyFromDir('Stream API Endpoints (Anime Indo)')).toBe('stream');
    expect(normalizeSourceKeyFromDir('Nimegami API')).toBe('nimegami');
    expect(normalizeSourceKeyFromDir('Winbu API Endpoints')).toBe('winbu');
    expect(normalizeSourceKeyFromDir('docs')).toBe('unknown');
  });

  it('detects snapshot folders and rejects app/internal folders', () => {
    expect(isLikelySnapshotDir('samehadaku')).toBe(true);
    expect(isLikelySnapshotDir('AnimeSail API Endpoints')).toBe(true);
    expect(isLikelySnapshotDir('src')).toBe(false);
    expect(isLikelySnapshotDir('scripts')).toBe(false);
    expect(isLikelySnapshotDir('node_modules')).toBe(false);
    expect(isLikelySnapshotDir('config')).toBe(false);
  });

  it('builds endpoint paths from json file names', () => {
    expect(buildEndpointFromFile('one-piece.json', 'samehadaku')).toBe('/samehadaku/one-piece');
    expect(buildEndpointFromFile('home.json', 'animesail')).toBe('/animesail/home');
    expect(buildEndpointFromFile('One Piece Episode 1150.json', 'animekuindo')).toBe('/animekuindo/one-piece-episode-1150');
  });
});