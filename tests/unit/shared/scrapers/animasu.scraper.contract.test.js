'use strict';

describe('shared/scrapers/animasu.scraper contract', () => {
  let playwrightGet;
  let scraper;

  beforeEach(() => {
    jest.resetModules();
    playwrightGet = jest.fn();

    jest.doMock('../../../../src/shared/scrapers/_playwright', () => ({
      playwrightGet,
    }));
    jest.doMock('../../../../src/shared/scrapers/_cache', () => ({
      remember: async (_key, _ttl, loader) => loader(),
    }));

    scraper = require('../../../../src/shared/scrapers/animasu.scraper');
  });

  it('getLatest returns list aliases and pagination', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="bsx"><a href="https://v1.animasu.app/anime/op-indonesia/"><img src="op.jpg"><span class="tt">One Piece</span><span class="epx">Episode 1158</span></a></div>
        <div class="bsx"><a href="https://v1.animasu.app/anime/naruto/"><img src="naruto.jpg"><span class="tt">Naruto</span><span class="epx">Episode 220</span></a></div>
        <div class="pagination"><span class="current">1</span><a class="page-numbers">3</a></div>
      </body></html>
    `);

    const result = await scraper.getLatest({ page: 1 });

    expect(Array.isArray(result.anime_list)).toBe(true);
    expect(Array.isArray(result.animeList)).toBe(true);
    expect(result.anime_list).toHaveLength(2);
    expect(result.animeList).toEqual(result.anime_list);
    expect(result.pagination).toEqual({ hasNext: true, hasPrev: false, currentPage: 1 });
  });

  it('deduplicates same slug in listing', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="bsx"><a href="https://v1.animasu.app/anime/op-indonesia/"><span class="tt">One Piece</span></a></div>
        <div class="bsx"><a href="https://v1.animasu.app/anime/op-indonesia/"><span class="tt">One Piece Duplicate</span></a></div>
      </body></html>
    `);

    const result = await scraper.getLatest({ page: 1 });
    expect(result.anime_list).toHaveLength(1);
    expect(result.anime_list[0].slug).toBe('op-indonesia');
  });

  it('getDetail returns episodes and episodeList aliases', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <h1 class="entry-title">One Piece Serial Sub Indo</h1>
        <div class="thumb"><img src="op.jpg"></div>
        <div class="spe"><span><b>Status:</b> Ongoing</span><span><b>Type:</b> TV</span></div>
        <a href="https://v1.animasu.app/genre/aksi/">Aksi</a>
        <a href="https://v1.animasu.app/nonton-one-piece-episode-1158/">Episode 1158</a>
        <a href="https://v1.animasu.app/nonton-one-piece-episode-1157/">Episode 1157</a>
      </body></html>
    `);

    const result = await scraper.getDetail('op-indonesia');

    expect(result.title).toContain('One Piece');
    expect(result.slug).toBe('op-indonesia');
    expect(result.id).toBe('op-indonesia');
    expect(result.source).toBe('animasu');
    expect(Array.isArray(result.episodes)).toBe(true);
    expect(Array.isArray(result.episodeList)).toBe(true);
    expect(result.episodeList).toEqual(result.episodes);
    expect(result.episodes).toHaveLength(2);
  });

  it('search with empty keyword returns stable empty contract', async () => {
    const result = await scraper.search('   ', { page: 2 });

    expect(result.anime_list).toEqual([]);
    expect(result.animeList).toEqual([]);
    expect(result.pagination).toEqual({ hasNext: false, hasPrev: false, currentPage: 2 });
    expect(playwrightGet).not.toHaveBeenCalled();
  });
});
