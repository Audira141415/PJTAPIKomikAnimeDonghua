'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function createEmptyCheckpoint() {
  return {
    version: 1,
    updatedAt: null,
    sources: {},
  };
}

function normalizeCheckpoint(checkpoint) {
  const base = createEmptyCheckpoint();
  if (!checkpoint || typeof checkpoint !== 'object') {
    return base;
  }

  const sources = {};
  for (const [sourceKey, sourceState] of Object.entries(checkpoint.sources || {})) {
    if (!sourceState || typeof sourceState !== 'object') {
      continue;
    }

    const files = {};
    for (const [relativePath, entry] of Object.entries(sourceState.files || {})) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      files[relativePath] = {
        fingerprint: typeof entry.fingerprint === 'string' ? entry.fingerprint : null,
        checksum: typeof entry.checksum === 'string' ? entry.checksum : null,
        status: entry.status === 'failed' ? 'failed' : 'success',
        endpoint: typeof entry.endpoint === 'string' ? entry.endpoint : null,
        errorMessage: typeof entry.errorMessage === 'string' ? entry.errorMessage : null,
        processedAt: typeof entry.processedAt === 'string' ? entry.processedAt : null,
        filePath: typeof entry.filePath === 'string' ? entry.filePath : null,
        size: Number.isFinite(entry.size) ? entry.size : null,
        mtimeMs: Number.isFinite(entry.mtimeMs) ? entry.mtimeMs : null,
        meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : {},
      };
    }

    sources[sourceKey] = {
      updatedAt: typeof sourceState.updatedAt === 'string' ? sourceState.updatedAt : null,
      files,
    };
  }

  return {
    version: Number.isInteger(checkpoint.version) ? checkpoint.version : 1,
    updatedAt: typeof checkpoint.updatedAt === 'string' ? checkpoint.updatedAt : null,
    sources,
  };
}

function getFileFingerprint(statLike) {
  if (!statLike || typeof statLike !== 'object') {
    return null;
  }

  const size = Number.isFinite(statLike.size) ? statLike.size : null;
  const mtimeMs = Number.isFinite(statLike.mtimeMs) ? Math.trunc(statLike.mtimeMs) : null;
  if (size === null || mtimeMs === null) {
    return null;
  }

  return `${size}:${mtimeMs}`;
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getSourceRecord(checkpoint, sourceKey) {
  const normalized = normalizeCheckpoint(checkpoint);
  return normalized.sources[sourceKey] || { updatedAt: null, files: {} };
}

function shouldProcessSnapshot(checkpoint, { sourceKey, relativePath, fingerprint }) {
  if (!sourceKey || !relativePath) {
    return true;
  }

  const sourceRecord = getSourceRecord(checkpoint, sourceKey);
  const fileRecord = sourceRecord.files[relativePath];
  if (!fileRecord) {
    return true;
  }

  if (fileRecord.status !== 'success') {
    return true;
  }

  if (!fingerprint) {
    return true;
  }

  return fileRecord.fingerprint !== fingerprint;
}

function selectPendingSnapshots(files, checkpoint) {
  const pending = [];
  const skipped = [];

  for (const file of files) {
    if (shouldProcessSnapshot(checkpoint, file)) {
      pending.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { pending, skipped };
}

function updateCheckpointSource(checkpoint, sourceKey, updater) {
  const normalized = normalizeCheckpoint(checkpoint);
  const sourceRecord = normalized.sources[sourceKey] || { updatedAt: null, files: {} };
  const nextSource = updater(sourceRecord);

  return {
    ...normalized,
    sources: {
      ...normalized.sources,
      [sourceKey]: nextSource,
    },
    updatedAt: new Date().toISOString(),
  };
}

function recordSnapshotSuccess(checkpoint, {
  sourceKey,
  relativePath,
  checksum,
  fingerprint,
  endpoint,
  filePath,
  size,
  mtimeMs,
  meta = {},
}) {
  return updateCheckpointSource(checkpoint, sourceKey, (sourceRecord) => ({
    ...sourceRecord,
    updatedAt: new Date().toISOString(),
    files: {
      ...sourceRecord.files,
      [relativePath]: {
        fingerprint: fingerprint || null,
        checksum: checksum || null,
        status: 'success',
        endpoint: endpoint || null,
        errorMessage: null,
        processedAt: new Date().toISOString(),
        filePath: filePath || null,
        size: Number.isFinite(size) ? size : null,
        mtimeMs: Number.isFinite(mtimeMs) ? mtimeMs : null,
        meta,
      },
    },
  }));
}

function recordSnapshotFailure(checkpoint, {
  sourceKey,
  relativePath,
  fingerprint,
  endpoint,
  filePath,
  size,
  mtimeMs,
  errorMessage,
}) {
  return updateCheckpointSource(checkpoint, sourceKey, (sourceRecord) => ({
    ...sourceRecord,
    updatedAt: new Date().toISOString(),
    files: {
      ...sourceRecord.files,
      [relativePath]: {
        fingerprint: fingerprint || null,
        checksum: null,
        status: 'failed',
        endpoint: endpoint || null,
        errorMessage: errorMessage || 'Unknown error',
        processedAt: new Date().toISOString(),
        filePath: filePath || null,
        size: Number.isFinite(size) ? size : null,
        mtimeMs: Number.isFinite(mtimeMs) ? mtimeMs : null,
        meta: {},
      },
    },
  }));
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
    const wrapped = new Error(`Invalid checkpoint file at ${checkpointPath}: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

function saveCheckpointState(checkpointPath, checkpoint) {
  if (!checkpointPath) {
    throw new Error('checkpointPath is required');
  }

  const normalized = normalizeCheckpoint(checkpoint);
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  const tempPath = `${checkpointPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, checkpointPath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (_cleanupError) {
      // noop
    }
    throw error;
  }

  return normalized;
}

module.exports = {
  createEmptyCheckpoint,
  normalizeCheckpoint,
  getFileFingerprint,
  hashContent,
  shouldProcessSnapshot,
  selectPendingSnapshots,
  recordSnapshotSuccess,
  recordSnapshotFailure,
  loadCheckpointState,
  saveCheckpointState,
};
