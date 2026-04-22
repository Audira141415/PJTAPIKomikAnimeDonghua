'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createEmptyCheckpoint,
  getFileFingerprint,
  loadCheckpointState,
  shouldProcessSnapshot,
  selectPendingSnapshots,
  recordSnapshotSuccess,
  saveCheckpointState,
} = require('../../../../apps/worker-scrapers/animeSnapshotCheckpoint');

describe('modules/jobs/animeSnapshotCheckpoint', () => {
  it('skips unchanged successful files and retries failed files for the same source', () => {
    const checkpoint = {
      version: 1,
      updatedAt: '2026-04-12T00:00:00.000Z',
      sources: {
        samehadaku: {
          updatedAt: '2026-04-12T00:00:00.000Z',
          files: {
            'home.json': {
              fingerprint: '100:200',
              checksum: 'abc',
              status: 'success',
            },
            'popular.json': {
              fingerprint: '101:201',
              checksum: 'def',
              status: 'failed',
            },
          },
        },
      },
    };

    expect(shouldProcessSnapshot(checkpoint, {
      sourceKey: 'samehadaku',
      relativePath: 'home.json',
      fingerprint: '100:200',
    })).toBe(false);

    expect(shouldProcessSnapshot(checkpoint, {
      sourceKey: 'samehadaku',
      relativePath: 'popular.json',
      fingerprint: '101:201',
    })).toBe(true);

    expect(shouldProcessSnapshot(checkpoint, {
      sourceKey: 'samehadaku',
      relativePath: 'home.json',
      fingerprint: '999:999',
    })).toBe(true);
  });

  it('selects only pending files across sources using checkpoint metadata', () => {
    const files = [
      {
        sourceKey: 'samehadaku',
        relativePath: 'home.json',
        fingerprint: '100:200',
      },
      {
        sourceKey: 'samehadaku',
        relativePath: 'popular.json',
        fingerprint: '101:201',
      },
      {
        sourceKey: 'animesail',
        relativePath: 'home.json',
        fingerprint: '300:400',
      },
    ];

    const checkpoint = {
      version: 1,
      updatedAt: '2026-04-12T00:00:00.000Z',
      sources: {
        samehadaku: {
          updatedAt: '2026-04-12T00:00:00.000Z',
          files: {
            'home.json': {
              fingerprint: '100:200',
              checksum: 'abc',
              status: 'success',
            },
          },
        },
      },
    };

    const result = selectPendingSnapshots(files, checkpoint);

    expect(result.pending).toHaveLength(2);
    expect(result.pending.map((item) => `${item.sourceKey}:${item.relativePath}`)).toEqual([
      'samehadaku:popular.json',
      'animesail:home.json',
    ]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].relativePath).toBe('home.json');
  });

  it('records successful files into a source-scoped checkpoint', () => {
    const checkpoint = createEmptyCheckpoint();
    const fingerprint = getFileFingerprint({ size: 12, mtimeMs: 34 });

    const nextState = recordSnapshotSuccess(checkpoint, {
      sourceKey: 'samehadaku',
      relativePath: 'home.json',
      checksum: 'checksum-1',
      fingerprint,
      endpoint: '/samehadaku/home',
    });

    expect(nextState.sources.samehadaku.files['home.json']).toEqual(
      expect.objectContaining({
        checksum: 'checksum-1',
        fingerprint,
        status: 'success',
        endpoint: '/samehadaku/home',
      })
    );
    expect(checkpoint.sources.samehadaku).toBeUndefined();
  });

  it('loads missing checkpoints as empty and rejects corrupted checkpoint files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anime-checkpoint-'));
    const missingPath = path.join(tempDir, 'missing.json');
    const corruptPath = path.join(tempDir, 'corrupt.json');

    fs.writeFileSync(corruptPath, '{not-json', 'utf8');

    expect(loadCheckpointState(missingPath)).toEqual(createEmptyCheckpoint());
    expect(() => loadCheckpointState(corruptPath)).toThrow(/Invalid checkpoint file/);
  });

  it('writes normalized checkpoint state to disk', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anime-checkpoint-write-'));
    const checkpointPath = path.join(tempDir, 'checkpoint.json');

    const saved = saveCheckpointState(checkpointPath, {
      version: 1,
      updatedAt: null,
      sources: {
        samehadaku: {
          updatedAt: null,
          files: {
            'home.json': {
              fingerprint: '12:34',
              checksum: 'abc',
              status: 'success',
            },
          },
        },
      },
    });

    const persisted = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));

    expect(saved.sources.samehadaku.files['home.json'].checksum).toBe('abc');
    expect(persisted.sources.samehadaku.files['home.json'].fingerprint).toBe('12:34');
  });
});