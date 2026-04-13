'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_CHECKPOINT = path.join(ROOT_DIR, 'logs', 'full-import.checkpoint.json');
const DEFAULT_PROGRESS_LOG = path.join(ROOT_DIR, 'logs', 'full-import.progress.log');

const STAGE_REGISTRY = [
  {
    key: 'comic-seed',
    label: 'Import comics from local dataset',
    script: path.join(ROOT_DIR, 'scripts', 'comic-seed.js'),
    args: ['--file', path.join(ROOT_DIR, 'data', 'comics.json'), '--update'],
    supportsDryRun: true,
    requiredPaths: [path.join(ROOT_DIR, 'data', 'comics.json')],
  },
  {
    key: 'comic-sync',
    label: 'Sync comic sources from aggregator',
    script: path.join(ROOT_DIR, 'scripts', 'comic-sync-daily.js'),
    args: ['--sources', 'all', '--page', '1', '--update'],
    supportsDryRun: true,
  },
  {
    key: 'mangadex-all',
    label: 'Import all MangaDex content',
    script: path.join(ROOT_DIR, 'scripts', 'mangadex-import.js'),
    args: ['--all', '--update'],
  },
  {
    key: 'anime-snapshots',
    label: 'Import anime snapshots from local raw files',
    script: path.join(ROOT_DIR, 'scripts', 'import-snapshots-cli.js'),
    args: ['--root', path.join(ROOT_DIR, 'data', 'raw', 'comic-source')],
    supportsDryRun: true,
    requiredPaths: [path.join(ROOT_DIR, 'data', 'raw', 'comic-source')],
  },
  {
    key: 'anime-proxy',
    label: 'Sync anime and donghua sources through proxy APIs',
    script: path.join(ROOT_DIR, 'scripts', 'anime-sync-proxy.js'),
    args: ['--update'],
    supportsDryRun: true,
  },
];

function parseCsv(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice() : [];
  const hasFlag = (flag) => args.includes(flag);
  const getArg = (flag) => {
    const index = args.indexOf(flag);
    if (index === -1) {
      return null;
    }
    return args[index + 1] || null;
  };

  return {
    include: parseCsv(getArg('--include')),
    exclude: parseCsv(getArg('--exclude')),
    disabled: parseCsv(process.env.FULL_IMPORT_DISABLED_STAGES),
    stopAfter: getArg('--stop-after'),
    checkpoint: path.resolve(getArg('--checkpoint') || DEFAULT_CHECKPOINT),
    progressLog: path.resolve(getArg('--progress-log') || DEFAULT_PROGRESS_LOG),
    dryRun: hasFlag('--dry-run'),
    reset: hasFlag('--reset-checkpoint'),
    noResume: hasFlag('--no-resume'),
    continueOnError: hasFlag('--continue-on-error'),
    help: hasFlag('--help') || hasFlag('-h'),
  };
}

function createEmptyCheckpoint() {
  return {
    version: 1,
    pipeline: 'full-import',
    updatedAt: null,
    lastRun: null,
    stages: {},
  };
}

function normalizeCheckpoint(input) {
  const base = createEmptyCheckpoint();
  if (!input || typeof input !== 'object') {
    return base;
  }

  const stages = {};
  for (const [stageKey, stageState] of Object.entries(input.stages || {})) {
    if (!stageState || typeof stageState !== 'object') {
      continue;
    }

    const status = ['pending', 'running', 'success', 'failed', 'skipped'].includes(stageState.status)
      ? stageState.status
      : 'pending';

    stages[stageKey] = {
      status,
      attempts: Number.isInteger(stageState.attempts) ? stageState.attempts : 0,
      startedAt: typeof stageState.startedAt === 'string' ? stageState.startedAt : null,
      finishedAt: typeof stageState.finishedAt === 'string' ? stageState.finishedAt : null,
      durationMs: Number.isFinite(stageState.durationMs) ? stageState.durationMs : null,
      lastExitCode: Number.isInteger(stageState.lastExitCode) ? stageState.lastExitCode : null,
      lastError: typeof stageState.lastError === 'string' ? stageState.lastError : null,
      command: typeof stageState.command === 'string' ? stageState.command : null,
      lastMode: stageState.lastMode === 'dry-run' ? 'dry-run' : 'live',
    };
  }

  return {
    version: Number.isInteger(input.version) ? input.version : 1,
    pipeline: typeof input.pipeline === 'string' ? input.pipeline : 'full-import',
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : null,
    lastRun: input.lastRun && typeof input.lastRun === 'object' ? input.lastRun : null,
    stages,
  };
}

function loadCheckpointState(checkpointPath) {
  if (!checkpointPath || !fs.existsSync(checkpointPath)) {
    return createEmptyCheckpoint();
  }

  const raw = fs.readFileSync(checkpointPath, 'utf8');
  if (!raw.trim()) {
    return createEmptyCheckpoint();
  }

  try {
    return normalizeCheckpoint(JSON.parse(raw));
  } catch (error) {
    throw new Error(`Invalid checkpoint file at ${checkpointPath}: ${error.message}`);
  }
}

function saveCheckpointState(checkpointPath, state) {
  const normalized = normalizeCheckpoint(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });

  const tempPath = `${checkpointPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, checkpointPath);

  return normalized;
}

function logProgress(logPath, payload) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...payload,
  };

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function resolveSelectedStages(registry, options) {
  const availableKeys = registry.map((stage) => stage.key);
  const include = options.include || [];
  const exclude = new Set([...(options.exclude || []), ...(options.disabled || [])]);
  const stopAfter = options.stopAfter || null;

  const unknownInclude = include.filter((key) => !availableKeys.includes(key));
  const unknownExclude = [...exclude].filter((key) => !availableKeys.includes(key));
  if (unknownInclude.length || unknownExclude.length) {
    const bad = [...unknownInclude, ...unknownExclude].join(', ');
    throw new Error(`Unknown stage key(s): ${bad}`);
  }

  if (stopAfter && !availableKeys.includes(stopAfter)) {
    throw new Error(`Unknown --stop-after stage: ${stopAfter}`);
  }

  let selected = include.length
    ? registry.filter((stage) => include.includes(stage.key))
    : registry.slice();

  selected = selected.filter((stage) => !exclude.has(stage.key));

  if (stopAfter) {
    const stopIndex = selected.findIndex((stage) => stage.key === stopAfter);
    if (stopIndex === -1) {
      throw new Error(`--stop-after stage ${stopAfter} is not in selected stage set.`);
    }
    selected = selected.slice(0, stopIndex + 1);
  }

  return selected;
}

function initializeStageState(checkpoint, stages) {
  const next = normalizeCheckpoint(checkpoint);
  for (const stage of stages) {
    if (!next.stages[stage.key]) {
      next.stages[stage.key] = {
        status: 'pending',
        attempts: 0,
        startedAt: null,
        finishedAt: null,
        durationMs: null,
        lastExitCode: null,
        lastError: null,
        command: null,
        lastMode: 'live',
      };
    }
  }
  return next;
}

function buildExecutionQueue(selectedStages, checkpoint, options = {}) {
  const resumeEnabled = options.resumeEnabled !== false;
  const currentMode = options.currentMode === 'dry-run' ? 'dry-run' : 'live';
  const queue = [];
  const skipped = [];

  for (const stage of selectedStages) {
    const state = checkpoint.stages[stage.key];
    const isCompatibleSuccess = state
      && state.status === 'success'
      && (state.lastMode === 'live' || state.lastMode === currentMode);

    if (resumeEnabled && isCompatibleSuccess) {
      skipped.push(stage.key);
      continue;
    }
    queue.push(stage);
  }

  return { queue, skipped };
}

function isStageRunnable(stage) {
  const required = Array.isArray(stage.requiredPaths) ? stage.requiredPaths : [];
  const missing = required.filter((requiredPath) => !fs.existsSync(requiredPath));
  if (!missing.length) {
    return { runnable: true, reason: null };
  }
  return {
    runnable: false,
    reason: `Missing required path(s): ${missing.join(', ')}`,
  };
}

function runChildStage(stage, extraArgs = []) {
  return new Promise((resolve) => {
    const commandArgs = [stage.script, ...stage.args, ...extraArgs];
    const child = spawn(process.execPath, commandArgs, {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(`[${stage.key}] ${chunk}`);
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(`[${stage.key}] ${chunk}`);
    });

    child.on('close', (code) => {
      resolve({
        exitCode: Number.isInteger(code) ? code : 1,
        command: `${process.execPath} ${commandArgs.join(' ')}`,
      });
    });
  });
}

function printHelp() {
  console.log('Usage: node scripts/full-import.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --include <stage1,stage2>   Run only selected stages');
  console.log('  --exclude <stage1,stage2>   Exclude stages from selected set');
  console.log('  FULL_IMPORT_DISABLED_STAGES Comma-separated stages disabled by environment');
  console.log('  --stop-after <stage>        Stop selection after this stage');
  console.log('  --checkpoint <path>         Custom checkpoint file');
  console.log('  --progress-log <path>       Custom progress log JSONL file');
  console.log('  --dry-run                   Pass --dry-run to supported stages');
  console.log('  --no-resume                 Ignore success states in checkpoint');
  console.log('  --reset-checkpoint          Clear checkpoint before running');
  console.log('  --continue-on-error         Continue remaining stages even if one fails');
  console.log('  -h, --help                  Show this help text');
  console.log('');
  console.log('Available stages:');
  STAGE_REGISTRY.forEach((stage) => {
    console.log(`  - ${stage.key}: ${stage.label}`);
  });
}

function createRunOptionsSnapshot(options) {
  return {
    include: options.include,
    exclude: options.exclude,
    disabled: options.disabled,
    stopAfter: options.stopAfter,
    dryRun: options.dryRun,
    resume: !options.noResume,
    continueOnError: options.continueOnError,
  };
}

async function runPipeline(options) {
  const runId = `run-${Date.now()}`;
  const selectedStages = resolveSelectedStages(STAGE_REGISTRY, options);

  if (!selectedStages.length) {
    throw new Error('No stages selected. Check --include/--exclude options.');
  }

  let checkpoint = options.reset ? createEmptyCheckpoint() : loadCheckpointState(options.checkpoint);
  checkpoint = initializeStageState(checkpoint, selectedStages);
  checkpoint.lastRun = {
    id: runId,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    selectedStages: selectedStages.map((stage) => stage.key),
    options: createRunOptionsSnapshot(options),
  };
  checkpoint = saveCheckpointState(options.checkpoint, checkpoint);

  const currentMode = options.dryRun ? 'dry-run' : 'live';
  const { queue, skipped } = buildExecutionQueue(selectedStages, checkpoint, {
    resumeEnabled: !options.noResume,
    currentMode,
  });
  const summary = {
    runId,
    selected: selectedStages.length,
    skippedByResume: skipped.length,
    success: 0,
    failed: 0,
    skippedByMissingPath: 0,
  };

  console.log('----------------------------------------');
  console.log('Full import orchestrator');
  console.log(`Run ID      : ${runId}`);
  console.log(`Checkpoint  : ${options.checkpoint}`);
  console.log(`Progress log: ${options.progressLog}`);
  console.log(`Stages      : ${selectedStages.map((stage) => stage.key).join(', ')}`);
  console.log(`Resume skip : ${skipped.length}`);
  console.log('----------------------------------------');

  logProgress(options.progressLog, {
    runId,
    level: 'info',
    event: 'run-start',
    selectedStages: selectedStages.map((stage) => stage.key),
    skippedByResume: skipped,
  });

  for (const stage of queue) {
    const preflight = isStageRunnable(stage);
    if (!preflight.runnable) {
      summary.skippedByMissingPath += 1;
      checkpoint.stages[stage.key] = {
        ...checkpoint.stages[stage.key],
        status: 'skipped',
        lastError: preflight.reason,
        finishedAt: new Date().toISOString(),
      };
      checkpoint = saveCheckpointState(options.checkpoint, checkpoint);
      logProgress(options.progressLog, {
        runId,
        level: 'warn',
        event: 'stage-skipped',
        stage: stage.key,
        reason: preflight.reason,
      });
      console.log(`[SKIP] ${stage.key} :: ${preflight.reason}`);
      continue;
    }

    const start = Date.now();
    const stageState = checkpoint.stages[stage.key] || {};
    const extraArgs = options.dryRun && stage.supportsDryRun ? ['--dry-run'] : [];

    checkpoint.stages[stage.key] = {
      ...stageState,
      status: 'running',
      attempts: (stageState.attempts || 0) + 1,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationMs: null,
      lastExitCode: null,
      lastError: null,
      lastMode: currentMode,
    };
    checkpoint = saveCheckpointState(options.checkpoint, checkpoint);

    logProgress(options.progressLog, {
      runId,
      level: 'info',
      event: 'stage-start',
      stage: stage.key,
      args: [...stage.args, ...extraArgs],
    });

    const result = await runChildStage(stage, extraArgs);
    const durationMs = Date.now() - start;

    if (result.exitCode === 0) {
      summary.success += 1;
      checkpoint.stages[stage.key] = {
        ...checkpoint.stages[stage.key],
        status: 'success',
        finishedAt: new Date().toISOString(),
        durationMs,
        lastExitCode: 0,
        command: result.command,
        lastMode: currentMode,
      };

      checkpoint = saveCheckpointState(options.checkpoint, checkpoint);
      logProgress(options.progressLog, {
        runId,
        level: 'info',
        event: 'stage-success',
        stage: stage.key,
        durationMs,
      });
      continue;
    }

    summary.failed += 1;
    const failureMessage = `Stage ${stage.key} exited with code ${result.exitCode}`;
    checkpoint.stages[stage.key] = {
      ...checkpoint.stages[stage.key],
      status: 'failed',
      finishedAt: new Date().toISOString(),
      durationMs,
      lastExitCode: result.exitCode,
      lastError: failureMessage,
      command: result.command,
      lastMode: currentMode,
    };
    checkpoint = saveCheckpointState(options.checkpoint, checkpoint);
    logProgress(options.progressLog, {
      runId,
      level: 'error',
      event: 'stage-failed',
      stage: stage.key,
      durationMs,
      exitCode: result.exitCode,
      message: failureMessage,
    });

    if (!options.continueOnError) {
      break;
    }
  }

  checkpoint.lastRun = {
    ...checkpoint.lastRun,
    status: summary.failed > 0 ? 'failed' : 'success',
    finishedAt: new Date().toISOString(),
    summary,
  };
  checkpoint = saveCheckpointState(options.checkpoint, checkpoint);

  logProgress(options.progressLog, {
    runId,
    level: 'info',
    event: 'run-finish',
    status: summary.failed > 0 ? 'failed' : 'success',
    summary,
  });

  console.log('----------------------------------------');
  console.log(`Selected             : ${summary.selected}`);
  console.log(`Skipped (resume)     : ${summary.skippedByResume}`);
  console.log(`Skipped (preflight)  : ${summary.skippedByMissingPath}`);
  console.log(`Success              : ${summary.success}`);
  console.log(`Failed               : ${summary.failed}`);
  console.log('----------------------------------------');

  if (summary.failed > 0) {
    process.exitCode = 1;
  }

  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await runPipeline(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('FATAL:', error.message);
    process.exit(1);
  });
}

module.exports = {
  STAGE_REGISTRY,
  parseCsv,
  parseArgs,
  createEmptyCheckpoint,
  normalizeCheckpoint,
  resolveSelectedStages,
  createRunOptionsSnapshot,
  initializeStageState,
  buildExecutionQueue,
  isStageRunnable,
};
