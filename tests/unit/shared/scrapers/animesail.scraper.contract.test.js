'use strict';

describe('shared/scrapers/animesail.scraper contract', () => {
  let playwrightGet;
  let scraper;

  const challengeHtml = `
    <html><head><title>Loading..</title><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></head><body></body></html>
  `;

  beforeEach(() => {
    jest.resetModules();
    playwrightGet = jest.fn();

    jest.doMock('../../../../src/shared/scrapers/_playwright', () => ({
      playwrightGet,
    }));
    jest.doMock('../../../../src/shared/scrapers/_cache', () => ({
      remember: async (_key, _ttl, loader) => loader(),
    }));

    scraper = require('../../../../src/shared/scrapers/animesail.scraper');
  });

  it('getMovies returns list aliases and pagination contract', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="bsx"><a href="https://animesail.com/anime/naruto/">Naruto Subtitle Indonesia TV · Completed</a></div>
        <div class="bsx"><a href="https://animesail.com/anime/one-piece/">One Piece Subtitle Indonesia TV · Ongoing</a></div>
        <div class="pagination"><span class="current">1</span><a class="page-numbers">2</a></div>
      </body></html>
    `);

    const result = await scraper.getMovies({ page: 1 });

    expect(result.anime_list).toHaveLength(2);
    expect(result.animeList).toEqual(result.anime_list);
    expect(result.pagination).toEqual({ hasNext: true, hasPrev: false, currentPage: 1 });
  });

  it('getDetail normal page exposes poster and episode aliases', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <h1 class="entry-title">Naruto Subtitle Indonesia</h1>
        <div class="thumb"><img src="naruto.jpg"></div>
        <a href="https://animesail.com/genres/action/">Action</a>
        <a href="https://animesail.com/naruto-episode-1-subtitle-indonesia/">Episode 1</a>
      </body></html>
    `);

    const result = await scraper.getDetail('naruto');

    expect(result.title).toContain('Naruto');
    expect(result.poster).toBe('naruto.jpg');
    expect(result.id).toBe('naruto');
    expect(result.slug).toBe('naruto');
    expect(result.source).toBe('animesail');
    expect(Array.isArray(result.episodes)).toBe(true);
    expect(Array.isArray(result.episodeList)).toBe(true);
    expect(result.episodeList).toEqual(result.episodes);
  });

  it('challenge page returns empty list contract for getHome', async () => {
    playwrightGet.mockResolvedValueOnce(challengeHtml);

    const result = await scraper.getHome({ page: 1 });

    expect(result).toEqual({
      anime_list: [],
      animeList: [],
      pagination: { hasNext: false, hasPrev: false, currentPage: 1 },
    });
  });

  it('challenge page returns safe empty detail contract', async () => {
    playwrightGet.mockResolvedValueOnce(challengeHtml);

    const result = await scraper.getDetail('naruto');

    expect(result).toMatchObject({
      title: '',
      poster: null,
      genres: [],
      episodes: [],
      episodeList: [],
      id: 'naruto',
      slug: 'naruto',
      source: 'animesail',
    });
  });

  it('non-challenge errors are not swallowed in list paths', async () => {
    playwrightGet.mockRejectedValueOnce(new Error('network down'));
    await expect(scraper.getHome({ page: 1 })).rejects.toThrow('network down');
  });
});
