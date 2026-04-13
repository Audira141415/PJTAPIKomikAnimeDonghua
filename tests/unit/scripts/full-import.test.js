'use strict';

const {
  STAGE_REGISTRY,
  createEmptyCheckpoint,
  createRunOptionsSnapshot,
  normalizeCheckpoint,
  parseArgs,
  resolveSelectedStages,
  initializeStageState,
  buildExecutionQueue,
} = require('../../../scripts/full-import');

describe('scripts/full-import', () => {
  it('selects all stages when include and exclude are empty', () => {
    const selected = resolveSelectedStages(STAGE_REGISTRY, {
      include: [],
      exclude: [],
      stopAfter: null,
    });

    expect(selected.map((stage) => stage.key)).toEqual(STAGE_REGISTRY.map((stage) => stage.key));
  });

  it('supports include and stop-after filtering', () => {
    const selected = resolveSelectedStages(STAGE_REGISTRY, {
      include: ['comic-seed', 'comic-sync', 'anime-proxy'],
      exclude: [],
      stopAfter: 'comic-sync',
    });

    expect(selected.map((stage) => stage.key)).toEqual(['comic-seed', 'comic-sync']);
  });

  it('throws for unknown stage in include list', () => {
    expect(() => resolveSelectedStages(STAGE_REGISTRY, {
      include: ['does-not-exist'],
      exclude: [],
      stopAfter: null,
    })).toThrow(/Unknown stage key/);
  });

  it('excludes stages disabled by configuration', () => {
    const selected = resolveSelectedStages(STAGE_REGISTRY, {
      include: [],
      exclude: [],
      disabled: ['mangadex-all'],
      stopAfter: null,
    });

    expect(selected.map((stage) => stage.key)).toEqual([
      'comic-seed',
      'comic-sync',
      'anime-snapshots',
      'anime-proxy',
    ]);
  });

  it('reads disabled stages from environment in parseArgs', () => {
    const previous = process.env.FULL_IMPORT_DISABLED_STAGES;
    process.env.FULL_IMPORT_DISABLED_STAGES = 'mangadex-all,anime-proxy';

    try {
      const parsed = parseArgs([]);

      expect(parsed.disabled).toEqual(['mangadex-all', 'anime-proxy']);
    } finally {
      if (previous === undefined) {
        delete process.env.FULL_IMPORT_DISABLED_STAGES;
      } else {
        process.env.FULL_IMPORT_DISABLED_STAGES = previous;
      }
    }
  });

  it('captures disabled stages in run option snapshots', () => {
    const snapshot = createRunOptionsSnapshot({
      include: ['comic-seed'],
      exclude: ['anime-proxy'],
      disabled: ['mangadex-all'],
      stopAfter: 'anime-snapshots',
      dryRun: false,
      noResume: false,
      continueOnError: true,
    });

    expect(snapshot).toEqual({
      include: ['comic-seed'],
      exclude: ['anime-proxy'],
      disabled: ['mangadex-all'],
      stopAfter: 'anime-snapshots',
      dryRun: false,
      resume: true,
      continueOnError: true,
    });
  });

  it('initializes missing stage states as pending', () => {
    const checkpoint = initializeStageState(createEmptyCheckpoint(), STAGE_REGISTRY.slice(0, 2));

    expect(checkpoint.stages['comic-seed']).toEqual(expect.objectContaining({
      status: 'pending',
      attempts: 0,
      lastExitCode: null,
    }));
    expect(checkpoint.stages['comic-sync']).toEqual(expect.objectContaining({
      status: 'pending',
      attempts: 0,
    }));
  });

  it('builds queue by skipping success stages when resume enabled', () => {
    let checkpoint = createEmptyCheckpoint();
    checkpoint = initializeStageState(checkpoint, STAGE_REGISTRY.slice(0, 3));
    checkpoint.stages['comic-seed'].status = 'success';
    checkpoint.stages['comic-seed'].lastMode = 'live';
    checkpoint.stages['comic-sync'].status = 'failed';

    const { queue, skipped } = buildExecutionQueue(STAGE_REGISTRY.slice(0, 3), checkpoint, {
      resumeEnabled: true,
      currentMode: 'live',
    });

    expect(skipped).toEqual(['comic-seed']);
    expect(queue.map((stage) => stage.key)).toEqual(['comic-sync', 'mangadex-all']);
  });

  it('does not skip dry-run success when current run mode is live', () => {
    let checkpoint = createEmptyCheckpoint();
    checkpoint = initializeStageState(checkpoint, STAGE_REGISTRY.slice(0, 1));
    checkpoint.stages['comic-seed'].status = 'success';
    checkpoint.stages['comic-seed'].lastMode = 'dry-run';

    const { queue, skipped } = buildExecutionQueue(STAGE_REGISTRY.slice(0, 1), checkpoint, {
      resumeEnabled: true,
      currentMode: 'live',
    });

    expect(skipped).toEqual([]);
    expect(queue.map((stage) => stage.key)).toEqual(['comic-seed']);
  });

  it('skips dry-run success when current run mode is dry-run', () => {
    let checkpoint = createEmptyCheckpoint();
    checkpoint = initializeStageState(checkpoint, STAGE_REGISTRY.slice(0, 1));
    checkpoint.stages['comic-seed'].status = 'success';
    checkpoint.stages['comic-seed'].lastMode = 'dry-run';

    const { queue, skipped } = buildExecutionQueue(STAGE_REGISTRY.slice(0, 1), checkpoint, {
      resumeEnabled: true,
      currentMode: 'dry-run',
    });

    expect(skipped).toEqual(['comic-seed']);
    expect(queue).toEqual([]);
  });

  it('normalizes malformed checkpoint payload', () => {
    const normalized = normalizeCheckpoint({
      version: 'bad',
      stages: {
        'comic-seed': {
          status: 'invalid-status',
          attempts: 'one',
          durationMs: 'not-number',
        },
      },
    });

    expect(normalized.version).toBe(1);
    expect(normalized.stages['comic-seed']).toEqual(expect.objectContaining({
      status: 'pending',
      attempts: 0,
      durationMs: null,
      lastMode: 'live',
    }));
  });
});
