'use strict';

describe('shared/scrapers/stream.scraper contract', () => {
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

    scraper = require('../../../../src/shared/scrapers/stream.scraper');
  });

  it('getLatest keeps legacy wrapper and latest item contract', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="menu">
          <a href="/one-piece-episode-1157/"><div class="list-anime"><img data-original="/img/135253l.jpg"><p>One Piece</p><span class="eps">1157</span></div></a>
          <a href="/ghost-concert-missing-songs-episode-2/"><div class="list-anime"><img data-original="/img/Ghost-Concert-Missing-Songs.jpg"><p>Ghost Concert: Missing Songs</p><span class="eps">2</span></div></a>
        </div>
      </body></html>
    `);

    const result = await scraper.getLatest(1);

    expect(result.status).toBe(200);
    expect(result.creator).toBe('Sanka Vollerei');
    expect(result.page).toBe(1);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0]).toMatchObject({
      title: 'One Piece',
      slug: 'one-piece-episode-1157',
      episode: '1157',
    });
  });

  it('getPopular returns title/slug/poster/genres shape', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="nganan">
          <table class="ztable"><tr>
            <td class="zvithumb"><a href="/anime/one-piece/"><img src="/img/135253l.jpg"></a></td>
            <td class="zvidesc"><a href="/anime/one-piece/">One Piece</a><br>Action, Adventure, Comedy</td>
          </tr></table>
        </div>
      </body></html>
    `);

    const result = await scraper.getPopular();

    expect(result.status).toBe(200);
    expect(result.creator).toBe('Sanka Vollerei');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      title: 'One Piece',
      poster: 'https://anime-indo.lol/img/135253l.jpg',
      slug: 'one-piece',
      genres: ['Action', 'Adventure', 'Comedy'],
    });
  });

  it('getAnime returns legacy detail fields including episodes', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <h1>One Piece</h1>
        <div class="detail">
          <img src="/img/135253l.jpg">
          <a href="/genres/action/">Action</a>
          <a href="/genres/adventure/">Adventure</a>
          <p>Gol D. Roger dikenal sebagai Raja Bajak Laut.</p>
        </div>
        <a href="/one-piece-episode-000/">000</a>
        <a href="/one-piece-episode-001/">001</a>
      </body></html>
    `);

    const result = await scraper.getAnime('one-piece');

    expect(result.status).toBe(200);
    expect(result.data.title).toBe('One Piece');
    expect(result.data.poster).toBe('https://anime-indo.lol/img/135253l.jpg');
    expect(result.data.genres).toEqual(['Action', 'Adventure']);
    expect(result.data.episodes).toEqual([
      { eps_title: 'Episode  000', eps_slug: 'one-piece-episode-000' },
      { eps_title: 'Episode  001', eps_slug: 'one-piece-episode-001' },
    ]);
  });

  it('getEpisode returns stream_links, download_links and navigation slugs', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <h1>One Piece Episode 1000 Subtitle Indonesia</h1>
        <div class="detail"><img src="/img/135253l.jpg"><p>Episode synopsis.</p></div>
        <a class="server" data-video="//gdriveplayer.to/embed2.php?link=abc">GDRIVE</a>
        <a class="server" data-video="https://www.mp4upload.com/embed-123.html">MP4</a>
        <div class="nav">
          <a href="/one-piece-episode-999/">« Prev</a>
          <a href="/anime/one-piece/">Semua Episode</a>
          <a href="/one-piece-episode-1001/">Next »</a>
        </div>
        <a href="//gdriveplayer.to/download.php?link=abc">Download Gdrive</a>
        <a href="https://www.mp4upload.com/abc123.html">Download Mp4</a>
      </body></html>
    `);

    const result = await scraper.getEpisode('one-piece-episode-1000');

    expect(result.status).toBe(200);
    expect(result.data.title).toContain('One Piece Episode 1000');
    expect(result.data.stream_links).toEqual([
      { server: 'GDRIVE', url: 'https://gdriveplayer.to/embed2.php?link=abc' },
      { server: 'MP4', url: 'https://www.mp4upload.com/embed-123.html' },
    ]);
    expect(result.data.download_links).toEqual([
      { server: 'Download Gdrive', url: 'https://gdriveplayer.to/download.php?link=abc' },
      { server: 'Download Mp4', url: 'https://www.mp4upload.com/abc123.html' },
    ]);
    expect(result.data.prev_slug).toBe('one-piece-episode-999');
    expect(result.data.next_slug).toBe('one-piece-episode-1001');
  });

  it('search returns anime-level slugs from table cards (primary path)', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <table class="otable"><tr>
          <td class="vithumb"><img src="/img/135253l.jpg"></td>
          <td class="videsc">
            <a href="/anime/one-piece/">One Piece</a>
            <span class="des">A pirate adventure.</span>
            <span class="label">TV</span><span class="label">Ongoing</span><span class="label">2000</span>
          </td>
        </tr></table>
      </body></html>
    `);

    const result = await scraper.search('one piece');

    expect(result.status).toBe(200);
    expect(result.page).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe('one-piece');
    expect(result.data[0].title).toBe('One Piece');
  });

  it('search fallback strips episode suffix to return anime-level slug', async () => {
    // When table cards return nothing, falls back to latest-card parser
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <div class="menu">
          <a href="/one-piece-episode-1157/"><div class="list-anime"><img data-original="/img/op.jpg"><p>One Piece</p><span class="eps">1157</span></div></a>
        </div>
      </body></html>
    `);

    const result = await scraper.search('one piece');

    expect(result.status).toBe(200);
    expect(result.data).toHaveLength(1);
    // Slug must be the anime-level slug, not episode slug
    expect(result.data[0].slug).toBe('one-piece');
    expect(result.data[0].slug).not.toMatch(/-episode-\d+/i);
  });

  it('getMovies returns table card shape with page field', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <table class="otable"><tr>
          <td class="vithumb"><img src="/img/film.jpg"></td>
          <td class="videsc">
            <a href="/anime/spirited-away/">Spirited Away</a>
            <span class="des">A girl traps in spirit world.</span>
            <span class="label">Movie</span><span class="label">Completed</span><span class="label">2001</span>
          </td>
        </tr></table>
      </body></html>
    `);

    const result = await scraper.getMovies(1);

    expect(result.status).toBe(200);
    expect(result.page).toBe('1');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      title: 'Spirited Away',
      slug: 'spirited-away',
      poster: 'https://anime-indo.lol/img/film.jpg',
    });
  });

  it('getByGenre returns table card shape', async () => {
    playwrightGet.mockResolvedValueOnce(`
      <html><body>
        <table class="otable"><tr>
          <td class="vithumb"><img src="/img/action.jpg"></td>
          <td class="videsc">
            <a href="/anime/dragon-ball-z/">Dragon Ball Z</a>
            <span class="des">Goku fights strong enemies.</span>
            <span class="label">TV</span><span class="label">Completed</span><span class="label">1989</span>
          </td>
        </tr></table>
      </body></html>
    `);

    const result = await scraper.getByGenre('action', 1);

    expect(result.status).toBe(200);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe('dragon-ball-z');
    expect(result.data[0].title).toBe('Dragon Ball Z');
  });

  it('getList and getGenres keep legacy wrapper fields', async () => {
    playwrightGet
      .mockResolvedValueOnce(`
        <html><body>
          <div class="anime-list">
            <a href="/anime/one-piece/">One Piece</a>
            <a href="/anime/naruto-shippuden/">Naruto Shippuden</a>
          </div>
        </body></html>
      `)
      .mockResolvedValueOnce(`
        <html><body>
          <div class="list-genre">
            <a href="/genres/action/">Action</a>
            <a href="/genres/comedy/">Comedy</a>
          </div>
        </body></html>
      `);

    const list = await scraper.getList();
    const genres = await scraper.getGenres();

    expect(list.status).toBe(200);
    expect(list.total).toBe(2);
    expect(list.data[0]).toEqual({ title: 'One Piece', slug: 'one-piece' });

    expect(genres.status).toBe(200);
    expect(genres.data).toEqual([
      { title: 'Action', slug: 'action' },
      { title: 'Comedy', slug: 'comedy' },
    ]);
  });
});
