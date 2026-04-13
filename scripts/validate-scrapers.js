'use strict';

const { samehadaku, oploverz } = require('../src/shared/scrapers');

async function main() {
  const results = [];

  const run = async (name, fn) => {
    try {
      const info = await fn();
      results.push({ name, ok: true, info });
    } catch (error) {
      results.push({ name, ok: false, info: error.message });
    }
  };

  await run('samehadaku.ongoing', async () => {
    const d = await samehadaku.getOngoing({ page: 1 });
    return `items=${d.animeList?.length || 0}, first=${d.animeList?.[0]?.title || '-'}`;
  });

  await run('samehadaku.completed', async () => {
    const d = await samehadaku.getCompleted({ page: 1 });
    return `items=${d.animeList?.length || 0}, first=${d.animeList?.[0]?.title || '-'}`;
  });

  let shAnimeId = 'one-piece';
  await run('samehadaku.detail', async () => {
    const d = await samehadaku.getAnimeDetail(shAnimeId);
    const epCount = d.episodeList?.length || 0;
    return `title=${d.title || '-'}, episodes=${epCount}`;
  });

  await run('samehadaku.episode', async () => {
    const detail = await samehadaku.getAnimeDetail(shAnimeId);
    const shEpisodeId = detail.episodeList?.[0]?.episodeId || null;
    if (!shEpisodeId) throw new Error('episodeId not found from detail');
    const e = await samehadaku.getEpisode(shEpisodeId);
    return `episodeId=${shEpisodeId}, title=${e.title || '-'}, streaming=${e.defaultStreamingUrl ? 'yes' : 'no'}`;
  });

  await run('oploverz.ongoing', async () => {
    const d = await oploverz.getOngoing({ page: 1 });
    return `items=${d.animeList?.length || 0}, first=${d.animeList?.[0]?.title || '-'}`;
  });

  await run('oploverz.completed', async () => {
    const d = await oploverz.getCompleted({ page: 1 });
    return `items=${d.animeList?.length || 0}, first=${d.animeList?.[0]?.title || '-'}`;
  });

  const opSlug = 'one-piece';
  await run('oploverz.detail', async () => {
    const d = await oploverz.getAnime(opSlug);
    const epCount = d.episodeList?.length || 0;
    return `title=${d.title || '-'}, episodes=${epCount}`;
  });

  await run('oploverz.episode', async () => {
    const detail = await oploverz.getAnime(opSlug);
    const epSlug = detail.episodeList?.[0]?.episodeSlug || null;
    if (!epSlug) throw new Error('episodeSlug not found from detail');
    const e = await oploverz.getEpisode(epSlug);
    return `episodeSlug=${epSlug}, title=${e.title || '-'}, streaming=${e.defaultStreamingUrl ? 'yes' : 'no'}`;
  });

  console.log('=== VALIDATION RESULT ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.name} | ${r.info}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`SUMMARY: total=${results.length}, pass=${results.length - failed}, fail=${failed}`);

  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('FATAL:', error.message);
  process.exit(1);
});
