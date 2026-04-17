'use strict';

const crypto = require('crypto');
const slugify = require('slugify');

const ANIMATION_TYPES = new Set(['anime', 'donghua', 'movie', 'ona']);

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.replace(/\s+/g, ' ').trim();
  return text || null;
};

const pickFirst = (...values) => {
  for (const value of values) {
    const text = normalizeText(typeof value === 'number' ? String(value) : value);
    if (text) {
      return text;
    }
  }
  return null;
};

const parseSafeDate = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseDurationMinutes = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeGenres = (raw) => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        return normalizeText(entry);
      }

      if (entry && typeof entry === 'object') {
        return normalizeText(entry.title || entry.name || entry.genre || entry.label);
      }

      return null;
    })
    .filter(Boolean);
};

const normalizeType = (value) => {
  const text = normalizeText(value)?.toLowerCase();
  if (!text) {
    return null;
  }

  for (const type of ['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona']) {
    if (text === type || text.includes(type)) {
      return type;
    }
  }

  return null;
};

const normalizeRating = (value) => {
  const text = pickFirst(value);
  if (!text) {
    return null;
  }

  const cleaned = text
    .replace(/[,，]/g, '.')
    .replace(/\.{2,}/g, '.');

  const ratioMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (ratioMatch) {
    const rating = Number.parseFloat(ratioMatch[1]);
    return Number.isNaN(rating) ? null : rating;
  }

  const match = cleaned.match(/\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const rating = Number.parseFloat(match[0]);
  return Number.isNaN(rating) ? null : rating;
};

const normalizeSnapshotEnvelope = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      status: 'unknown',
      creator: null,
      message: null,
      data: {},
      pagination: null,
    };
  }

  return {
    status: snapshot.status || 'unknown',
    creator: snapshot.creator || null,
    message: snapshot.message || null,
    data: snapshot.data || {},
    pagination: snapshot.pagination || null,
  };
};

const detectSnapshotKind = (data) => {
  if (!data || typeof data !== 'object') {
    return 'unknown';
  }

  if (Array.isArray(data.animeList) || Array.isArray(data.days)) {
    return 'collection';
  }

  if (data.server || data.defaultStreamingUrl || data.downloadUrl) {
    return 'episode-detail';
  }

  if (Array.isArray(data.episodeList) || Array.isArray(data.batchList) || Array.isArray(data.recommendedEpisodeList)) {
    return 'series-detail';
  }

  if (Array.isArray(data.results) || Array.isArray(data.items)) {
    return 'collection';
  }

  if (data.title && data.poster) {
    return 'series-detail';
  }

  return 'unknown';
};

const parseEpisodeNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const normalized = text.replace(/([0-9])\s*[-–—]\s*([0-9])/g, '$1.$2');
  const exact = normalized.match(/(?:episode|ep\.?|chap(?:ter)?)\s*(\d+(?:\.\d+)?)/i);
  if (exact) {
    return Number.parseFloat(exact[1]);
  }

  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : null;
};

const buildSeriesTitle = (data) => {
  const direct = pickFirst(data.title, data.name, data.animeTitle, data.seriesTitle, data.japanese, data.english);
  if (direct) {
    return direct;
  }

  const fromId = pickFirst(data.animeId, data.slug, data.id);
  if (!fromId) {
    return null;
  }

  return fromId
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim() || null;
};

const stripEpisodeSuffix = (title) => {
  const text = normalizeText(title);
  if (!text) {
    return null;
  }

  return text
    .replace(/\b(?:episode|ep\.?)\s*\d+(?:\.\d+)?\b.*$/i, '')
    .replace(/\bsub\s*indo\b.*$/i, '')
    .replace(/\bsubtitle\s*indonesia\b.*$/i, '')
    .replace(/\bsub\s*indonesia\b.*$/i, '')
    .replace(/[-:|]\s*$/, '')
    .trim() || null;
};

const buildExternalRefs = (sourceKey, sourceId, sourceUrl, kind = 'snapshot') => {
  const refs = [];
  if (sourceUrl) {
    refs.push({ sourceKey, sourceId, url: sourceUrl, kind });
  } else if (sourceId) {
    refs.push({ sourceKey, sourceId, url: null, kind });
  }
  return refs;
};

const buildMediaItem = (rawItem, context = {}) => {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const sourceKey = context.sourceKey || 'unknown';
  const sourceId = pickFirst(rawItem.animeId, rawItem.sourceId, rawItem.id, rawItem.slug);
  const title = buildSeriesTitle(rawItem);

  if (!title) {
    return null;
  }

  const slugBase = sourceId || title;
  const slug = slugify(slugBase, { lower: true, strict: true });
  if (!slug) {
    return null;
  }

  const type = normalizeType(rawItem.type) || context.defaultType || 'anime';
  const coverImage = pickFirst(rawItem.poster, rawItem.coverImage, rawItem.image, rawItem.thumb, rawItem.thumbnail, rawItem.img, rawItem.src);
  const sourceUrl = pickFirst(rawItem.samehadakuUrl, rawItem.sourceUrl, rawItem.url, rawItem.href, rawItem.link);
  const status = pickFirst(rawItem.status);
  const releaseDate = pickFirst(rawItem.releasedOn, rawItem.releaseDate, rawItem.airDate, rawItem.aired);

  return {
    title,
    alterTitle: pickFirst(rawItem.alterTitle, rawItem.japanese, rawItem.english, rawItem.synonyms),
    slug,
    description: pickFirst(rawItem.description, rawItem.synopsis?.paragraphs?.[0], rawItem.synopsis, rawItem.summary) || '',
    type,
    contentCategory: ANIMATION_TYPES.has(type) ? 'animation' : 'comic',
    genres: normalizeGenres(rawItem.genreList || rawItem.genres),
    author: pickFirst(rawItem.author, rawItem.writer) || 'Unknown',
    artist: pickFirst(rawItem.artist) || 'Unknown',
    studio: pickFirst(rawItem.studio, rawItem.studios),
    sub: pickFirst(rawItem.sub, rawItem.subtitle, rawItem.dub) || 'Sub',
    creator: pickFirst(rawItem.creator, context.creator) || null,
    released: releaseDate,
    duration: pickFirst(rawItem.duration),
    network: pickFirst(rawItem.network),
    country: pickFirst(rawItem.country),
    releasedOn: parseSafeDate(releaseDate),
    coverImage,
    status: normalizeText(status)?.toLowerCase() || 'ongoing',
    rating: normalizeRating(rawItem.score ?? rawItem.rating),
    ratingCount: null,
    views: 0,
    totalEpisodes: rawItem.totalEpisodes ?? parseEpisodeNumber(rawItem.episodes),
    sourceUrl,
    sourceKey,
    sourceId,
    externalRefs: buildExternalRefs(sourceKey, sourceId, sourceUrl, 'series'),
    synopsis: rawItem.synopsis || null,
    lastSyncedAt: new Date(),
  };
};

const buildEpisodeDoc = (rawItem, context = {}) => {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const sourceKey = context.sourceKey || 'unknown';
  const sourceId = pickFirst(rawItem.episodeId, rawItem.sourceId, rawItem.id, rawItem.slug, context.sourceId, context.fallbackSourceId);
  const title = pickFirst(rawItem.title, rawItem.name, rawItem.episodeTitle);
  const episodeNumber = parseEpisodeNumber(rawItem.episodeNumber ?? rawItem.title ?? rawItem.episode ?? rawItem.episodeId ?? sourceId);

  if (episodeNumber === null) {
    return null;
  }

  const slug = slugify(sourceId || `${context.seriesSlug || 'episode'}-${episodeNumber}`, { lower: true, strict: true });
  const sourceUrl = pickFirst(
    rawItem.samehadakuUrl,
    rawItem.defaultStreamingUrl,
    rawItem.sourceUrl,
    rawItem.url,
    rawItem.href,
    rawItem.link,
  );
  const streamUrls = Array.isArray(rawItem.streamUrls)
    ? rawItem.streamUrls
    : [];

  return {
    title: title || `Episode ${episodeNumber}`,
    episodeNumber,
    slug,
    thumbnail: pickFirst(rawItem.thumbnail, rawItem.poster, rawItem.image, rawItem.thumb),
    duration: parseDurationMinutes(rawItem.duration),
    streamUrls,
    subtitles: Array.isArray(rawItem.subtitles) ? rawItem.subtitles : [],
    isFiller: Boolean(rawItem.isFiller),
    releaseDate: parseSafeDate(rawItem.releaseDate),
    sourceUrl,
    sourceKey,
    sourceId,
    downloadUrls: rawItem.downloadUrls || rawItem.downloadUrl || null,
    externalRefs: buildExternalRefs(sourceKey, sourceId, sourceUrl, 'episode'),
  };
};

const mapEpisodeQualities = (server) => {
  const qualities = Array.isArray(server?.qualities) ? server.qualities : [];
  return qualities.flatMap((qualityGroup) => {
    const qualityLabel = normalizeText(qualityGroup?.title);
    const mappedQuality = qualityLabel ? qualityLabel.replace(/\s+/g, '').toLowerCase() : null;
    const serverList = Array.isArray(qualityGroup?.serverList) ? qualityGroup.serverList : [];

    return serverList
      .map((entry) => {
        const quality = mappedQuality || normalizeText(entry?.quality) || 'unknown';
        const url = pickFirst(entry?.url, entry?.href, entry?.link);
        if (!url) {
          return null;
        }

        return {
          quality,
          title: pickFirst(entry?.title, qualityGroup?.title) || quality,
          url,
          serverId: pickFirst(entry?.serverId, entry?.id),
        };
      })
      .filter(Boolean);
  });
};

const buildImportPlan = (snapshot, context = {}) => {
  const envelope = normalizeSnapshotEnvelope(snapshot);
  const data = envelope.data || {};
  const kind = context.kind || detectSnapshotKind(data);
  const limit = Number.isInteger(context.limit) && context.limit > 0 ? context.limit : null;

  if (kind === 'collection') {
    const sourceItems = Array.isArray(data.animeList)
      ? data.animeList
      : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.days)
            ? data.days.flatMap((day) => day.animeList || [])
            : [];

    const mediaItems = sourceItems
      .map((item) => buildMediaItem(item, context))
      .filter(Boolean)
      .slice(0, limit || sourceItems.length);

    return {
      envelope,
      kind,
      mediaItems,
      seasons: [],
      episodes: [],
    };
  }

  if (kind === 'series-detail') {
    const mediaItems = [buildMediaItem(data, context)].filter(Boolean);
    const episodeList = Array.isArray(data.episodeList) ? data.episodeList : [];
    const episodes = episodeList
      .map((item) => buildEpisodeDoc(item, {
        ...context,
        seriesSlug: mediaItems[0]?.slug,
      }))
      .filter(Boolean)
      .slice(0, limit || episodeList.length);

    const seasons = [
      {
        number: 1,
        title: 'Season 1',
        description: pickFirst(data.description, data.synopsis?.paragraphs?.[0]) || '',
        coverImage: pickFirst(data.poster, data.coverImage, data.image),
        year: (() => {
          const date = pickFirst(data.releasedOn, data.releaseDate, data.aired);
          if (!date) return null;
          const parsed = parseSafeDate(date);
          return parsed ? parsed.getFullYear() : null;
        })(),
        status: normalizeText(data.status)?.toLowerCase() || 'ongoing',
        episodeCount: episodes.length || episodeList.length,
      },
    ];

    return {
      envelope,
      kind,
      mediaItems,
      seasons,
      episodes,
    };
  }

  if (kind === 'episode-detail') {
    const seriesTitle = stripEpisodeSuffix(buildSeriesTitle(data)) || buildSeriesTitle(data) || 'Unknown Series';
    const seriesItem = buildMediaItem(
      {
        ...data,
        title: seriesTitle,
        animeId: data.animeId || data.seriesId || data.seriesSlug || data.id,
        type: data.type || context.defaultType || 'anime',
        status: data.status || 'ongoing',
      },
      context,
    );

    const episodeNumber = parseEpisodeNumber(data.episodeNumber ?? data.episode ?? data.title ?? data.episodeId);
    const episodeSourceId = data.episodeId || slugify(`${seriesItem?.slug || 'episode'}-episode-${episodeNumber}`, { lower: true, strict: true });

    const episodeItem = buildEpisodeDoc(
      {
        ...data,
        episodeNumber,
        streamUrls: mapEpisodeQualities(data.server),
        subtitles: Array.isArray(data.subtitles) ? data.subtitles : [],
        downloadUrls: data.downloadUrl || null,
        sourceId: episodeSourceId,
      },
      {
        ...context,
        seriesSlug: seriesItem?.slug,
        fallbackSourceId: episodeSourceId,
      },
    );

    const seasons = [
      {
        number: 1,
        title: 'Season 1',
        description: pickFirst(data.description, data.synopsis?.paragraphs?.[0]) || '',
        coverImage: pickFirst(data.poster, data.coverImage, data.image),
        year: (() => {
          const date = pickFirst(data.releasedOn, data.releaseDate, data.aired);
          if (!date) return null;
          const parsed = parseSafeDate(date);
          return parsed ? parsed.getFullYear() : null;
        })(),
        status: normalizeText(data.status)?.toLowerCase() || 'ongoing',
        episodeCount: 1,
      },
    ];

    return {
      envelope,
      kind,
      mediaItems: seriesItem ? [seriesItem] : [],
      seasons,
      episodes: episodeItem ? [episodeItem] : [],
    };
  }

  return {
    envelope,
    kind,
    mediaItems: [],
    seasons: [],
    episodes: [],
  };
};

const snapshotChecksum = (snapshot) => crypto.createHash('sha256').update(JSON.stringify(snapshot || {})).digest('hex');

module.exports = {
  buildEpisodeDoc,
  buildImportPlan,
  buildMediaItem,
  detectSnapshotKind,
  normalizeGenres,
  normalizeRating,
  normalizeSnapshotEnvelope,
  normalizeText,
  normalizeType,
  parseEpisodeNumber,
  snapshotChecksum,
};