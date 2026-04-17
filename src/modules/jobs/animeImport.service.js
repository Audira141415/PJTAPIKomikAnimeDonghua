'use strict';

const axios = require('axios');
const crypto = require('crypto');

const { env } = require('../../config/env');
const Manga = require('../../models/Manga');
const Season = require('../../models/Season');
const Episode = require('../../models/Episode');
const User = require('../../models/User');
const SourceFeed = require('../../models/SourceFeed');
const RawSnapshot = require('../../models/RawSnapshot');
const SyncRun = require('../../models/SyncRun');
const {
  buildImportPlan,
  normalizeSnapshotEnvelope,
  snapshotChecksum,
  normalizeText,
} = require('./animeSnapshot.mapper');
const { mirrorImage } = require('../../shared/utils/imageDownloader');
const telegram = require('../../shared/utils/telegram');

const SOURCE_ENDPOINTS = [
  { key: 'anime', path: '/anime/home', name: 'Anime' },
  { key: 'samehadaku', path: '/samehadaku/home', name: 'Samehadaku' },
  { key: 'animasu', path: '/animasu/home', name: 'Animasu' },
  { key: 'kusonime', path: '/kusonime/latest', name: 'Kusonime' },
  { key: 'anoboy', path: '/anoboy/home', name: 'Anoboy' },
  { key: 'animesail', path: '/animesail/home', name: 'AnimeSail' },
  { key: 'oploverz', path: '/oploverz/ongoing', name: 'Oploverz' },
  { key: 'stream', path: '/stream/latest', name: 'Stream' },
  { key: 'animekuindo', path: '/animekuindo/latest', name: 'Animekuindo' },
  { key: 'nimegami', path: '/nimegami/home', name: 'Nimegami' },
  { key: 'alqanime', path: '/alqanime/ongoing', name: 'AlQanime' },
  { key: 'donghub', path: '/donghub/latest', name: 'Donghub' },
  { key: 'winbu', path: '/winbu/latest', name: 'Winbu' },
  { key: 'kura', path: '/kura/home', name: 'Kura' },
  { key: 'dramabox', path: '/dramabox/latest', name: 'Dramabox' },
  { key: 'drachin', path: '/drachin/latest', name: 'Drachin' },
];

const SOURCE_MAP = new Map(SOURCE_ENDPOINTS.map((source) => [source.key, source]));

const client = axios.create({
  timeout: 20000,
  headers: { 'User-Agent': 'AudiraAnimeSync/1.0' },
});

function getDefaultBaseUrl() {
  return `http://localhost:${env.PORT || 3000}/api/v1`;
}

function pickFirst(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeExternalRefs(existingRefs = [], incomingRefs = []) {
  const map = new Map();

  for (const ref of [...existingRefs, ...incomingRefs]) {
    if (!ref || typeof ref !== 'object') {
      continue;
    }

    const key = [ref.sourceKey || '', ref.sourceId || '', ref.url || '', ref.kind || ''].join('|');
    if (!map.has(key)) {
      map.set(key, {
        sourceKey: ref.sourceKey || null,
        sourceId: ref.sourceId || null,
        url: ref.url || null,
        kind: ref.kind || 'series',
      });
    }
  }

  return Array.from(map.values());
}

function normalizeStatus(status, fallback = 'ongoing') {
  const text = normalizeText(status)?.toLowerCase();
  if (!text) {
    return fallback;
  }

  if (text.includes('complete') || text.includes('finished')) {
    return 'completed';
  }

  if (text.includes('hiatus')) {
    return 'hiatus';
  }

  if (text.includes('cancel')) {
    return 'cancelled';
  }

  if (text.includes('upcoming') || text.includes('soon')) {
    return 'upcoming';
  }

  return text;
}

function buildSourcePayload(sourceKey, sourceDefinition = {}) {
  const meta = SOURCE_MAP.get(sourceKey) || {};

  return {
    key: sourceKey,
    name: sourceDefinition.name || meta.name || sourceKey,
    category: sourceDefinition.category || meta.category || 'anime',
    baseUrl: sourceDefinition.baseUrl || meta.baseUrl || getDefaultBaseUrl(),
    endpoint: sourceDefinition.endpoint || meta.path || null,
    enabled: sourceDefinition.enabled ?? true,
    priority: sourceDefinition.priority ?? 100,
    defaultType: sourceDefinition.defaultType || meta.defaultType || 'anime',
    syncStrategy: sourceDefinition.syncStrategy || meta.syncStrategy || 'hybrid',
    notes: sourceDefinition.notes || '',
    meta: sourceDefinition.meta || {},
  };
}

async function ensureAdminUser() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Admin user tidak ditemukan. Buat admin lebih dulu sebelum sync anime.');
  }
  return admin;
}

async function ensureSourceFeed(sourceKey, sourceDefinition = {}) {
  const payload = buildSourcePayload(sourceKey, sourceDefinition);
  return SourceFeed.findOneAndUpdate(
    { key: sourceKey },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function createSyncRun({ sourceKey, source, endpoint, kind, envelope, requestMeta }) {
  const startedAt = new Date();
  return SyncRun.create({
    sourceKey,
    source: source?._id || null,
    endpoint,
    snapshotKind: kind,
    status: 'running',
    startedAt,
    fetchedCount: 0,
    mappedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errorMessage: null,
    checksum: snapshotChecksum(envelope),
    requestMeta,
    responseMeta: { pagination: envelope.pagination || null },
    meta: {},
  });
}

async function finishSyncRun(syncRunId, result, error = null) {
  const finishedAt = new Date();
  const durationMs = result.startedAt ? finishedAt.getTime() - result.startedAt.getTime() : null;

  return SyncRun.findByIdAndUpdate(
    syncRunId,
    {
      $set: {
        status: error ? 'failed' : result.mappedCount > 0 ? 'success' : 'partial',
        finishedAt,
        durationMs,
        fetchedCount: result.fetchedCount,
        mappedCount: result.mappedCount,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        errorCount: error ? 1 : 0,
        errorMessage: error ? error.message : null,
        checksum: result.checksum,
        responseMeta: result.responseMeta,
        meta: result.meta,
      },
    },
    { new: true },
  );
}

function countCollectionItems(envelope, kind, plan) {
  if (kind === 'collection') {
    const data = envelope.data || {};
    if (Array.isArray(data.animeList)) {
      return data.animeList.length;
    }
    if (Array.isArray(data.days)) {
      return data.days.reduce((total, day) => total + (Array.isArray(day.animeList) ? day.animeList.length : 0), 0);
    }
    if (Array.isArray(data.results)) {
      return data.results.length;
    }
    if (Array.isArray(data.items)) {
      return data.items.length;
    }
  }

  return plan.mediaItems.length + plan.seasons.length + plan.episodes.length;
}

async function upsertMediaItems(mediaItems, context) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const items = [];

  for (const item of mediaItems) {
    if (!item?.slug) {
      skipped += 1;
      continue;
    }

    if (item.coverImage) {
      item.coverImage = await mirrorImage(item.coverImage, item.type || 'unknown', item.slug);
    }

    const identityQuery = item.sourceKey && item.sourceId
      ? { sourceKey: item.sourceKey, sourceId: item.sourceId }
      : null;
    const existing = identityQuery
      ? await Manga.findOne(identityQuery) || await Manga.findOne({ slug: item.slug })
      : await Manga.findOne({ slug: item.slug });
    if (existing && typeof existing.save === 'function') {
      const mergedExternalRefs = mergeExternalRefs(existing.externalRefs || [], item.externalRefs || []);
      const patch = {
        ...item,
        externalRefs: mergedExternalRefs,
        sourceKey: existing.sourceKey || item.sourceKey || context.sourceKey,
        sourceId: existing.sourceId || item.sourceId || null,
        createdBy: existing.createdBy || item.createdBy || context.createdBy,
        lastSyncedAt: new Date(),
      };

      Object.entries(patch).forEach(([key, value]) => {
        if (value !== undefined) {
          existing[key] = value;
        }
      });

      await existing.save();
      items.push(existing);
      updated += 1;
      continue;
    }

    try {
      const created = await Manga.create({
        ...item,
        creator: item.creator || context.creator || env.SITE_CREATOR || 'Audira',
        createdBy: item.createdBy || context.createdBy,
        lastSyncedAt: new Date(),
      });

      items.push(created);
      inserted += 1;
    } catch (error) {
      const isDuplicateKey = error?.code === 11000;
      if (!isDuplicateKey) {
        throw error;
      }

      const fallbackExisting = await Manga.findOne({ slug: item.slug });
      if (!fallbackExisting || typeof fallbackExisting.save !== 'function') {
        throw error;
      }

      const mergedExternalRefs = mergeExternalRefs(fallbackExisting.externalRefs || [], item.externalRefs || []);
      const patch = {
        ...item,
        creator: item.creator || context.creator || env.SITE_CREATOR || 'Audira',
        createdBy: fallbackExisting.createdBy || item.createdBy || context.createdBy,
        externalRefs: mergedExternalRefs,
        sourceKey: fallbackExisting.sourceKey || item.sourceKey || context.sourceKey,
        sourceId: fallbackExisting.sourceId || item.sourceId || null,
        lastSyncedAt: new Date(),
      };

      const updatedDoc = await Manga.findOneAndUpdate(
        { _id: fallbackExisting._id },
        { $set: patch },
        { new: true, runValidators: false },
      );

      items.push(updatedDoc || fallbackExisting);
      updated += 1;
    }
  }

  return { inserted, updated, skipped, items };
}

async function upsertSeasons(seasons, seriesDoc, context) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const items = [];

  if (!seriesDoc) {
    return { inserted, updated, skipped, items };
  }

  for (const season of seasons) {
    if (!season || !Number.isFinite(season.number)) {
      skipped += 1;
      continue;
    }

    const existing = await Season.findOne({ series: seriesDoc._id, number: season.number });
    const payload = {
      series: seriesDoc._id,
      number: season.number,
      title: season.title || `Season ${season.number}`,
      description: season.description || '',
      coverImage: season.coverImage || null,
      year: season.year || null,
      status: normalizeStatus(season.status, 'ongoing'),
      episodeCount: season.episodeCount || 0,
      sourceKey: season.sourceKey || context.sourceKey,
      sourceId: season.sourceId || null,
      externalRefs: mergeExternalRefs(existing?.externalRefs || [], season.externalRefs || []),
    };

    if (existing && typeof existing.save === 'function') {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined) {
          existing[key] = value;
        }
      });

      await existing.save();
      items.push(existing);
      updated += 1;
      continue;
    }

    const created = await Season.create(payload);
    items.push(created);
    inserted += 1;
  }

  return { inserted, updated, skipped, items };
}

function mapEpisodeStreams(streamUrls = []) {
  if (!Array.isArray(streamUrls)) {
    return [];
  }

  return streamUrls
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const quality = normalizeText(entry.quality)?.toLowerCase();
      const url = pickFirst(entry.url, entry.href, entry.link);
      if (!quality || !url) {
        return null;
      }

      return {
        quality,
        url,
      };
    })
    .filter(Boolean);
}

async function upsertEpisodes(episodes, seriesDoc, seasonDoc, context) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const items = [];

  if (!seriesDoc) {
    return { inserted, updated, skipped, items };
  }

  for (const episode of episodes) {
    if (!episode || !Number.isFinite(episode.episodeNumber)) {
      skipped += 1;
      continue;
    }

    const existing = await Episode.findOne({ series: seriesDoc._id, episodeNumber: episode.episodeNumber });
    const payload = {
      series: seriesDoc._id,
      season: seasonDoc?._id || null,
      episodeNumber: episode.episodeNumber,
      title: episode.title || `Episode ${episode.episodeNumber}`,
      slug: episode.slug || null,
      description: episode.description || '',
      thumbnail: episode.thumbnail || null,
      duration: episode.duration || 0,
      streamUrls: mapEpisodeStreams(episode.streamUrls),
      subtitles: Array.isArray(episode.subtitles) ? episode.subtitles : [],
      isFiller: Boolean(episode.isFiller),
      releaseDate: episode.releaseDate || null,
      sourceUrl: episode.sourceUrl || null,
      sourceKey: episode.sourceKey || context.sourceKey,
      sourceId: episode.sourceId || null,
      downloadUrls: episode.downloadUrls || null,
      externalRefs: mergeExternalRefs(existing?.externalRefs || [], episode.externalRefs || []),
    };

    if (existing && typeof existing.save === 'function') {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined) {
          existing[key] = value;
        }
      });

      await existing.save();
      items.push(existing);
      updated += 1;
      continue;
    }

    const created = await Episode.create(payload);
    items.push(created);
    inserted += 1;
  }

  return { inserted, updated, skipped, items };
}

async function syncAnimeSnapshot(snapshot, options = {}) {
  const sourceKey = options.sourceKey || options.source?.key || 'unknown';
  const createdBy = options.createdBy || (options.dryRun ? null : (await ensureAdminUser())._id);
  const sourceDefinition = await ensureSourceFeed(sourceKey, options.source || {});
  const endpoint = options.endpoint || sourceDefinition.endpoint || SOURCE_MAP.get(sourceKey)?.path || '/unknown';
  const envelope = normalizeSnapshotEnvelope(snapshot);
  const plan = buildImportPlan(envelope, {
    sourceKey,
    endpoint,
    limit: options.limit,
    creator: options.creator || sourceDefinition.name,
    defaultType: options.defaultType || sourceDefinition.defaultType || 'anime',
  });

  const startedAt = new Date();
  const syncRun = await createSyncRun({
    sourceKey,
    source: sourceDefinition,
    endpoint,
    kind: plan.kind,
    envelope,
    requestMeta: {
      baseUrl: options.baseUrl || sourceDefinition.baseUrl || getDefaultBaseUrl(),
      limit: options.limit || null,
      update: options.update !== false,
      dryRun: Boolean(options.dryRun),
    },
  });

  const summary = {
    source: sourceKey,
    endpoint,
    kind: plan.kind,
    fetchedCount: countCollectionItems(envelope, plan.kind, plan),
    mappedCount: plan.mediaItems.length + plan.seasons.length + plan.episodes.length,
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    checksum: snapshotChecksum(envelope),
    responseMeta: { pagination: envelope.pagination || null },
    meta: {
      title: pickFirst(envelope.data?.title, envelope.data?.name),
      creator: envelope.creator || sourceDefinition.name,
    },
    startedAt,
  };

  try {
    await RawSnapshot.create({
      sourceKey,
      source: sourceDefinition._id || null,
      endpoint,
      snapshotKind: plan.kind,
      checksum: snapshotChecksum(envelope),
      payload: envelope,
      requestMeta: {
        baseUrl: options.baseUrl || sourceDefinition.baseUrl || getDefaultBaseUrl(),
        limit: options.limit || null,
      },
      responseMeta: { pagination: envelope.pagination || null },
      query: options.query || {},
      page: options.page ?? null,
      capturedAt: startedAt,
      syncRun: syncRun._id,
    });

    if (options.dryRun) {
      summary.skippedCount = summary.mappedCount;
      await finishSyncRun(syncRun._id, summary, null);
      return {
        source: sourceKey,
        endpoint,
        kind: plan.kind,
        fetched: summary.fetchedCount,
        mapped: summary.mappedCount,
        uniqueDocs: plan.mediaItems.length + plan.seasons.length + plan.episodes.length,
        inserted: 0,
        updated: 0,
        skipped: summary.skippedCount,
        conflicted: 0,
      };
    }

    const mediaResults = await upsertMediaItems(plan.mediaItems, {
      sourceKey,
      source: sourceDefinition,
      creator: options.creator || sourceDefinition.name,
      createdBy,
    });

    let primarySeries = mediaResults.items[0] || null;
    if (!primarySeries && plan.kind !== 'collection') {
      const fallbackSeries = plan.mediaItems[0];
      if (fallbackSeries) {
        const created = await Manga.create({
          ...fallbackSeries,
          creator: fallbackSeries.creator || options.creator || sourceDefinition.name,
          createdBy,
          lastSyncedAt: new Date(),
        });
        primarySeries = created;
        mediaResults.items.unshift(created);
        mediaResults.inserted += 1;
      }
    }

    const seasonResults = await upsertSeasons(plan.seasons, primarySeries, { sourceKey });
    const defaultSeason = seasonResults.items[0] || null;
    const episodeResults = await upsertEpisodes(plan.episodes, primarySeries, defaultSeason, { sourceKey });

    summary.insertedCount = mediaResults.inserted + seasonResults.inserted + episodeResults.inserted;
    summary.updatedCount = mediaResults.updated + seasonResults.updated + episodeResults.updated;
    summary.skippedCount = mediaResults.skipped + seasonResults.skipped + episodeResults.skipped;

    await finishSyncRun(syncRun._id, summary, null);

    // Kirim laporan ke Telegram Admin
    telegram.sendSyncReport(sourceKey, {
      inserted: summary.insertedCount,
      updated: summary.updatedCount,
      failed: summary.errorCount
    }).catch(() => undefined);

    return {
      source: sourceKey,
      endpoint,
      kind: plan.kind,
      fetched: summary.fetchedCount,
      mapped: summary.mappedCount,
      uniqueDocs: plan.mediaItems.length + plan.seasons.length + plan.episodes.length,
      inserted: summary.insertedCount,
      updated: summary.updatedCount,
      skipped: summary.skippedCount,
      conflicted: 0,
    };
  } catch (error) {
    await finishSyncRun(syncRun._id, summary, error);
    throw error;
  }
}

async function fetchSourceSnapshot(sourceKey, options = {}) {
  const sourceDefinition = SOURCE_MAP.get(sourceKey);
  if (!sourceDefinition) {
    throw new Error(`Source tidak ditemukan: ${sourceKey}`);
  }

  const baseUrl = options.baseUrl || getDefaultBaseUrl();
  const endpoint = options.endpoint || sourceDefinition.path;
  const response = await client.get(`${baseUrl}${endpoint}`);
  return {
    snapshot: response.data,
    endpoint,
    baseUrl,
  };
}

async function syncAnimeSource(sourceKey, options = {}) {
  const { snapshot, endpoint, baseUrl } = await fetchSourceSnapshot(sourceKey, options);
  return syncAnimeSnapshot(snapshot, {
    ...options,
    sourceKey,
    endpoint,
    baseUrl,
    source: SOURCE_MAP.get(sourceKey),
  });
}

async function syncAnimeSources(sourceKeys = SOURCE_ENDPOINTS.map((source) => source.key), options = {}) {
  const summary = [];

  for (const sourceKey of sourceKeys) {
    try {
      summary.push(await syncAnimeSource(sourceKey, options));
    } catch (error) {
      summary.push({
        source: sourceKey,
        endpoint: SOURCE_MAP.get(sourceKey)?.path || null,
        kind: 'unknown',
        fetched: 0,
        mapped: 0,
        uniqueDocs: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        conflicted: 0,
        error: error.message,
      });
    }
  }

  const totals = summary.reduce((acc, item) => ({
    fetched: acc.fetched + (item.fetched || 0),
    mapped: acc.mapped + (item.mapped || 0),
    uniqueDocs: acc.uniqueDocs + (item.uniqueDocs || 0),
    inserted: acc.inserted + (item.inserted || 0),
    updated: acc.updated + (item.updated || 0),
    skipped: acc.skipped + (item.skipped || 0),
    conflicted: acc.conflicted + (item.conflicted || 0),
  }), {
    fetched: 0,
    mapped: 0,
    uniqueDocs: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    conflicted: 0,
  });

  return { sources: summary, totals };
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const text = String(value).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(text);
}

module.exports = {
  SOURCE_ENDPOINTS,
  fetchSourceSnapshot,
  syncAnimeSnapshot,
  syncAnimeSource,
  syncAnimeSources,
  parseBoolean,
};