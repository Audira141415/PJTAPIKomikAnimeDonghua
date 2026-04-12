'use strict';

const path = require('path');
const slugify = require('slugify');

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'coverage',
  'src',
  'scripts',
  'tests',
  'logs',
  'uploads',
  'public',
  'frontend-adapter',
  '.github',
]);

const SOURCE_NAME_MAP = new Map([
  ['animesailapiendpoints', 'animesail'],
  ['animekuindoapiendpoints', 'animekuindo'],
  ['streamapiendpointsanimeindo', 'stream'],
  ['nimegamiapi', 'nimegami'],
  ['donghubapiendpoints', 'donghub'],
  ['winbuapiendpoints', 'winbu'],
]);

const KNOWN_SOURCE_KEYS = new Set([
  'samehadaku',
  'animesail',
  'animekuindo',
  'animasu',
  'anoboy',
  'kusonime',
  'oploverz',
  'nimegami',
  'donghub',
  'donghua',
  'winbu',
  'stream',
]);

function compactText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function normalizeSourceKeyFromDir(dirName) {
  const compact = compactText(dirName)
    .replace(/apiendpoints?/g, '')
    .replace(/api/g, '')
    .replace(/endpoints?/g, '')
    .replace(/animeindo/g, '');

  const mapped = SOURCE_NAME_MAP.get(compactText(dirName));
  if (mapped) {
    return mapped;
  }

  if (compact.includes('samehadaku')) return 'samehadaku';
  if (compact.includes('animesail')) return 'animesail';
  if (compact.includes('animekuindo')) return 'animekuindo';
  if (compact.includes('animasu')) return 'animasu';
  if (compact.includes('anoboy')) return 'anoboy';
  if (compact.includes('kusonime')) return 'kusonime';
  if (compact.includes('oploverz')) return 'oploverz';
  if (compact.includes('nimegami')) return 'nimegami';
  if (compact.includes('donghub')) return 'donghub';
  if (compact.includes('donghua')) return 'donghua';
  if (compact.includes('winbu')) return 'winbu';
  if (compact.includes('stream')) return 'stream';

  if (KNOWN_SOURCE_KEYS.has(compact)) {
    return compact;
  }

  return 'unknown';
}

function isLikelySnapshotDir(dirName) {
  if (!dirName) {
    return false;
  }

  if (EXCLUDED_DIRS.has(dirName)) {
    return false;
  }

  const lower = String(dirName).toLowerCase();
  if (lower.includes('api endpoints') || lower.endsWith(' api')) {
    return normalizeSourceKeyFromDir(dirName) !== 'unknown';
  }

  const sourceKey = normalizeSourceKeyFromDir(dirName);
  return sourceKey !== 'unknown';
}

function toSlugSegment(value) {
  const segment = slugify(String(value || ''), { lower: true, strict: true, trim: true });
  return segment || null;
}

function buildEndpointFromFile(relativeFilePath, sourceKey) {
  const parsed = String(relativeFilePath || '')
    .split(path.sep)
    .join('/')
    .replace(/\.json$/i, '');

  const segments = parsed
    .split('/')
    .map((segment) => toSlugSegment(segment))
    .filter(Boolean);

  if (!segments.length) {
    return `/${sourceKey}/snapshot`;
  }

  return `/${sourceKey}/${segments.join('/')}`;
}

module.exports = {
  EXCLUDED_DIRS,
  KNOWN_SOURCE_KEYS,
  normalizeSourceKeyFromDir,
  isLikelySnapshotDir,
  buildEndpointFromFile,
};