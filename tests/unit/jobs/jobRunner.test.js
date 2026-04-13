'use strict';

const { buildScraperArgs, runNodeJob } = require('../../../src/jobs/jobRunner');

describe('jobs/jobRunner', () => {
  it('buildScraperArgs builds default args for series-sync', () => {
    const args = buildScraperArgs('series-sync');
    expect(args).toEqual(['scripts/anichin-scraper.js', '--update']);
  });

  it('buildScraperArgs builds daily all-source anime sync args', () => {
    process.env.SCRAPER_API_BASE_URL = 'http://api:5000/api/v1';

    const args = buildScraperArgs('anime-sync-all', { limit: 200 });

    expect(args).toEqual([
      'scripts/anime-sync-proxy.js',
      '--update',
      '--limit',
      '200',
      '--base-url',
      'http://api:5000/api/v1',
    ]);

    delete process.env.SCRAPER_API_BASE_URL;
  });

  it('buildScraperArgs builds daily comic sync args', () => {
    const args = buildScraperArgs('comic-sync-daily');

    expect(args).toEqual(['scripts/mangadex-import.js', '--all', '--update']);
  });

  it('buildScraperArgs builds daily comic source fan-out args', () => {
    const args = buildScraperArgs('comic-sync-sources');

    expect(args).toEqual(['scripts/comic-sync-daily.js', '--sources', 'all', '--page', '1']);
  });

  it('buildScraperArgs builds daily full import args', () => {
    const args = buildScraperArgs('full-import-daily');

    expect(args).toEqual(['scripts/full-import.js', '--reset-checkpoint']);
  });

  it('buildScraperArgs appends supported job data flags', () => {
    const args = buildScraperArgs('episode-sync-ongoing', {
      delayMs: 1500,
      limit: 20,
      skip: 5,
      seriesUrl: 'https://anichin.cafe/seri/foo/',
      dryRun: true,
    });

    expect(args).toEqual([
      'scripts/anichin-scraper.js',
      '--episodes',
      '--update',
      '--delay',
      '1500',
      '--limit',
      '20',
      '--skip',
      '5',
      '--series-url',
      'https://anichin.cafe/seri/foo/',
      '--dry-run',
    ]);
  });

  it('runNodeJob resolves on zero exit code', async () => {
    const result = await runNodeJob(['-e', "console.log('ok')"], { timeoutMs: 5000 });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('ok');
  });

  it('runNodeJob rejects on non-zero exit code', async () => {
    await expect(runNodeJob(['-e', 'process.exit(2)'], { timeoutMs: 5000 }))
      .rejects.toThrow('exit code 2');
  });
});
