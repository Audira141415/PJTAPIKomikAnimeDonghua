'use strict';
require('module-alias/register');


require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { env } = require('@core/config/env');
const { syncAnimeSnapshot } = require('../src/modules/jobs/animeImport.service');
const {
  createEmptyCheckpoint,
  getFileFingerprint,
  hashContent,
  loadCheckpointState,
  recordSnapshotFailure,
  recordSnapshotSuccess,
  saveCheckpointState,
  selectPendingSnapshots,
} = require('../src/modules/jobs/animeSnapshotCheckpoint');
const {
  isLikelySnapshotDir,
  normalizeSourceKeyFromDir,
  buildEndpointFromFile,
} = require('../src/modules/jobs/animeSnapshotImport.helpers');

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return args[index + 1] || null;
};

const ROOT_DIR = path.resolve(getArg('--root') || process.cwd());
const DRY_RUN = hasFlag('--dry-run');
const VERBOSE = hasFlag('--verbose');
const BASE_URL = getArg('--base-url') || `http://localhost:${env.PORT || 3000}/api/v1`;
const CHECKPOINT_FILE = path.resolve(getArg('--checkpoint') || path.join(ROOT_DIR, 'logs', 'import-snapshots.checkpoint.json'));
const SOURCE_FILTER = (getArg('--source') || '')
  .split(',')
  .map((source) => source.trim())
  .filter(Boolean);
const LIMIT = Number.parseInt(getArg('--limit') || '0', 10);
const RESET_CHECKPOINT = hasFlag('--reset-checkpoint');
const USE_CHECKPOINT = !hasFlag('--no-checkpoint');

function listTopLevelDirs(rootDir) {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function collectJsonFilesRecursive(dirPath, sourcePath, sourceKey, files = [], maxFiles = 0) {
  if (maxFiles > 0 && files.length >= maxFiles) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (maxFiles > 0 && files.length >= maxFiles) {
      break;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectJsonFilesRecursive(fullPath, sourcePath, sourceKey, files, maxFiles);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      const stats = fs.statSync(fullPath);
      files.push({
        sourceKey,
        sourcePath,
        filePath: fullPath,
        relativePath: path.relative(sourcePath, fullPath),
        fingerprint: getFileFingerprint(stats),
        size: stats.size,
        mtimeMs: stats.mtimeMs,
      });
    }
  }

  return files;
}

function resolveSnapshotFolders(rootDir, sourceFilter) {
  const folders = listTopLevelDirs(rootDir)
    .filter((dirName) => isLikelySnapshotDir(dirName))
    .map((dirName) => ({
      name: dirName,
      path: path.join(rootDir, dirName),
      sourceKey: normalizeSourceKeyFromDir(dirName),
    }))
    .filter((folder) => folder.sourceKey !== 'unknown');

  if (!sourceFilter.length) {
    return folders;
  }

  const wanted = new Set(sourceFilter.map((source) => source.toLowerCase()));
  return folders.filter((folder) => wanted.has(folder.sourceKey.toLowerCase()));
}

function sourceDisplayName(sourceKey) {
  return sourceKey
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function printSummary(summary) {
  console.log('----------------------------------------');
  console.log(`Root        : ${ROOT_DIR}`);
  console.log(`Base URL    : ${BASE_URL}`);
  console.log(`Checkpoint  : ${USE_CHECKPOINT ? CHECKPOINT_FILE : 'disabled'}`);
  console.log(`Dry Run     : ${DRY_RUN}`);
  console.log(`Files       : ${summary.files}`);
  console.log(`Imported    : ${summary.imported}`);
  console.log(`Failed      : ${summary.failed}`);
  console.log(`Fetched     : ${summary.fetched}`);
  console.log(`Mapped      : ${summary.mapped}`);
  console.log(`Inserted    : ${summary.inserted}`);
  console.log(`Updated     : ${summary.updated}`);
  console.log(`Skipped     : ${summary.skipped}`);
  console.log(`Checkpoint skipped : ${summary.checkpointSkipped || 0}`);
  console.log(`Checkpoint errors  : ${summary.checkpointErrors || 0}`);
  console.log('----------------------------------------');
}

async function run() {
  if (!Number.isInteger(LIMIT) || LIMIT < 0) {
    throw new Error('Argumen --limit harus bilangan bulat >= 0.');
  }

  const folders = resolveSnapshotFolders(ROOT_DIR, SOURCE_FILTER);
  if (!folders.length) {
    throw new Error('Tidak ada folder snapshot yang cocok untuk diimport.');
  }

  const fileQueue = [];
  for (const folder of folders) {
    const limitedFiles = collectJsonFilesRecursive(folder.path, folder.path, folder.sourceKey)
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    fileQueue.push(...limitedFiles);
  }

  if (!fileQueue.length) {
    throw new Error('Tidak ada file JSON yang ditemukan untuk diimport.');
  }

  let checkpointState = USE_CHECKPOINT
    ? (RESET_CHECKPOINT ? createEmptyCheckpoint() : loadCheckpointState(CHECKPOINT_FILE))
    : createEmptyCheckpoint();

  const checkpointSelection = USE_CHECKPOINT
    ? selectPendingSnapshots(fileQueue, checkpointState)
    : { pending: fileQueue, skipped: [] };

  const selectedFiles = LIMIT > 0 ? checkpointSelection.pending.slice(0, LIMIT) : checkpointSelection.pending;
  if (!selectedFiles.length) {
    printSummary({
      files: fileQueue.length,
      imported: 0,
      failed: 0,
      fetched: 0,
      mapped: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      checkpointSkipped: checkpointSelection.skipped.length,
      checkpointErrors: 0,
    });
    return;
  }

  await mongoose.connect(env.MONGO_URI);

  const summary = {
    files: selectedFiles.length,
    imported: 0,
    failed: 0,
    fetched: 0,
    mapped: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    checkpointSkipped: checkpointSelection.skipped.length,
    checkpointErrors: 0,
  };

  for (const item of selectedFiles) {
    const endpoint = buildEndpointFromFile(item.relativePath, item.sourceKey);

    try {
      const raw = fs.readFileSync(item.filePath, 'utf8');
      const checksum = hashContent(raw);
      const snapshot = JSON.parse(raw);

      const result = await syncAnimeSnapshot(snapshot, {
        sourceKey: item.sourceKey,
        endpoint,
        baseUrl: BASE_URL,
        dryRun: DRY_RUN,
        source: {
          key: item.sourceKey,
          name: sourceDisplayName(item.sourceKey),
          baseUrl: BASE_URL,
          endpoint,
        },
      });

      summary.imported += 1;
      summary.fetched += result.fetched || 0;
      summary.mapped += result.mapped || 0;
      summary.inserted += result.inserted || 0;
      summary.updated += result.updated || 0;
      summary.skipped += result.skipped || 0;

      if (USE_CHECKPOINT && !DRY_RUN) {
        checkpointState = recordSnapshotSuccess(checkpointState, {
          sourceKey: item.sourceKey,
          relativePath: item.relativePath,
          checksum,
          fingerprint: item.fingerprint,
          endpoint,
          filePath: item.filePath,
          size: item.size,
          mtimeMs: item.mtimeMs,
          meta: {
            fetched: result.fetched || 0,
            mapped: result.mapped || 0,
            inserted: result.inserted || 0,
            updated: result.updated || 0,
            skipped: result.skipped || 0,
          },
        });
        try {
          checkpointState = saveCheckpointState(CHECKPOINT_FILE, checkpointState);
        } catch (checkpointError) {
          summary.checkpointErrors += 1;
          console.log(`[WARN] checkpoint save failed :: ${checkpointError.message}`);
        }
      }

      if (VERBOSE) {
        console.log(`[OK] ${item.sourceKey.padEnd(12)} ${item.relativePath} -> ${endpoint}`);
      }
    } catch (error) {
      summary.failed += 1;

      if (USE_CHECKPOINT && !DRY_RUN) {
        checkpointState = recordSnapshotFailure(checkpointState, {
          sourceKey: item.sourceKey,
          relativePath: item.relativePath,
          fingerprint: item.fingerprint,
          endpoint,
          filePath: item.filePath,
          size: item.size,
          mtimeMs: item.mtimeMs,
          errorMessage: error.message,
        });
        try {
          checkpointState = saveCheckpointState(CHECKPOINT_FILE, checkpointState);
        } catch (checkpointError) {
          summary.checkpointErrors += 1;
          console.log(`[WARN] checkpoint save failed :: ${checkpointError.message}`);
        }
      }

      console.log(`[FAIL] ${item.sourceKey.padEnd(12)} ${item.relativePath} :: ${error.message}`);
    }
  }

  await mongoose.disconnect();
  printSummary(summary);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

run().catch(async (error) => {
  console.error('FATAL:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_err) {
    // noop
  }
  process.exit(1);
});