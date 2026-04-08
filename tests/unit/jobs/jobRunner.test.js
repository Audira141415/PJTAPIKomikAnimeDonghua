'use strict';

const { buildScraperArgs, runNodeJob } = require('../../../src/jobs/jobRunner');

describe('jobs/jobRunner', () => {
  it('buildScraperArgs builds default args for series-sync', () => {
    const args = buildScraperArgs('series-sync');
    expect(args).toEqual(['scripts/anichin-scraper.js', '--update']);
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
