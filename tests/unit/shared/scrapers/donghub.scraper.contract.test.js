'use strict';

describe('shared/scrapers/donghub.scraper contract', () => {
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

    scraper = require('../../../../src/shared/scrapers/donghub.scraper');
  });

  it('getLatest returns data and animeList aliases for collection compatibility', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="bsx"><a href="https://donghub.vip/one-piece/"><img src="one.jpg">One Piece Subtitle Indonesia ONA · Ongoing</a></div>
        <div class="bsx"><a href="https://donghub.vip/naruto/"><img src="naruto.jpg">Naruto Subtitle Indonesia TV · Completed</a></div>
      </body></html>
    `);

    const result = await scraper.getLatest({ page: 1 });

    expect(Array.isArray(result.data)).toBe(true);
    expect(Array.isArray(result.anime_list)).toBe(true);
    expect(Array.isArray(result.animeList)).toBe(true);
    expect(result.anime_list).toEqual(result.data);
    expect(result.animeList).toEqual(result.data);
  });

  it('getList keeps alias fields for import mapper compatibility', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="bsx"><a href="https://donghub.vip/soul-land-2-the-unrivaled-tang-sect/"><img src="sl2.jpg">Soul Land 2 Subtitle Indonesia ONA · Ongoing</a></div>
      </body></html>
    `);

    const result = await scraper.getList({ page: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.anime_list).toEqual(result.data);
    expect(result.animeList).toEqual(result.data);
  });

  it('getDetail returns episode list contract fields', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <h1 class="entry-title">Soul Land 2: The Unrivaled Tang Sect</h1>
        <div class="thumb"><img src="sl2.jpg"></div>
        <div class="spe"><span><b>Status:</b> Ongoing</span><span><b>Type:</b> ONA</span></div>
        <a href="https://donghub.vip/genres/action/">Action</a>
        <ul class="eplister">
          <li><a href="https://donghub.vip/soul-land-2-episode-135-subtitle-indonesia/">Soul Land 2 Episode 135 Subtitle Indonesia</a><span class="epl-date">Januari 9, 2026</span></li>
        </ul>
      </body></html>
    `);

    const result = await scraper.getDetail('soul-land-2-the-unrivaled-tang-sect');

    expect(result.title).toContain('Soul Land 2');
    expect(Array.isArray(result.episodes)).toBe(true);
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].slug).toBe('soul-land-2-episode-135-subtitle-indonesia');
  });
});
