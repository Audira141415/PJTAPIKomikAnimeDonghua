const slugify = require('slugify');
const {              Manga, Episode, Season              } = require('@models');
const cache = require('@core/utils/cache');
const { env } = require('@core/config/env');
const ApiError = require('@core/errors/ApiError');
const { paginate, paginateMeta } = require('@core/utils/paginate');

const DONGHUA_TYPES  = ['donghua', 'movie', 'ona'];
const DONGHUA_FILTER = { type: { $in: DONGHUA_TYPES } };
const SITE_CREATOR   = env.SITE_CREATOR;

// ─── Format Helpers ───────────────────────────────────────────────────────────

/** Capitalize first letter of status: "ongoing" → "Ongoing" */
const capitalizeStatus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Normalize type for display: "ona" → "ONA", "donghua" → "Donghua" etc. */
const TYPE_LABELS = { ona: 'ONA', donghua: 'Donghua', movie: 'Movie', anime: 'Anime', manga: 'Manga', manhwa: 'Manhwa', manhua: 'Manhua' };
const capitalizeType = (t) => TYPE_LABELS[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/** Slugify a genre name for URL use */
const genreToSlug = (g) => slugify(g, { lower: true, strict: true });

/** Format a Manga doc → series card shape */
const formatSeries = (doc) => ({
  title:       doc.title,
  slug:        doc.slug,
  poster:      doc.coverImage || null,
  status:      capitalizeStatus(doc.status),
  type:        capitalizeType(doc.type),
  episodes:    doc.totalEpisodes != null ? `${doc.totalEpisodes} episodes` : '? episodes',
  alternative: doc.alterTitle || null,
  rating:      doc.rating > 0 ? doc.rating : null,
  studio:      doc.studio || null,
  description: (doc.description || '').substring(0, 200),
  genres:      (doc.genres || []).map((g) => {
    const gSlug = genreToSlug(g);
    return {
      name:       g,
      href:       `/donghua/genres/${gSlug}`,
      anichinUrl: `https://anichin.cafe/genres/${gSlug}`,
    };
  }),
  href:        `/donghua/detail/${doc.slug}`,
  anichinUrl:  doc.sourceUrl || null,
});

/** Format latest episode + series info → latest_release card shape */
const formatLatestEpisode = (ep, series) => {
  const epNum = ep.episodeNumber;
  const currentEpisode = epNum === 0 ? 'Special' : `Ep ${epNum}`;
  const epHref = ep.slug
    ? `/donghua/episode/${ep.slug}`
    : `/donghua/${series.slug}/episodes/${ep._id}`;

  return {
    title:           ep.title || `${series.title} Episode ${epNum}`,
    seriesSlug:      series.slug,
    poster:          series.coverImage || null,
    status:          capitalizeStatus(series.status),
    type:            capitalizeType(series.type),
    current_episode: currentEpisode,
    href:            epHref,
    anichinUrl:      ep.sourceUrl || null,
  };
};

// ─── Home ────────────────────────────────────────────────────────────────────
/**
 * GET /donghua/home
 *  - latest_release  : 20 most recently added episodes from donghua series
 *  - completed_donghua: 20 completed donghua sorted by updatedAt desc
 */
const getHome = async () => {
  // H-8: Use server-side aggregation instead of Manga.distinct() + Episode.$in
  // This avoids serializing hundreds of ObjectIds over the Node→MongoDB wire
  const [recentEpisodes, completedSeries] = await Promise.all([
    Episode.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 200 },
      {
        $lookup: {
          from: 'mangas',
          localField: 'series',
          foreignField: '_id',
          as: 'series',
          pipeline: [
            { $match: { ...DONGHUA_FILTER, ...Manga.getDiscoveryFilter() } },
            { $project: { title: 1, slug: 1, coverImage: 1, status: 1, type: 1, sourceUrl: 1 } },
          ],
        },
      },
      { $match: { 'series.0': { $exists: true } } },
      { $addFields: { series: { $arrayElemAt: ['$series', 0] } } },
      { $limit: 20 },
    ]),
    Manga.find({ ...DONGHUA_FILTER, ...Manga.getDiscoveryFilter(), status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title slug coverImage status type alterTitle rating studio description genres totalEpisodes sourceUrl')
      .lean(),
  ]);

  const latestRelease = recentEpisodes
    .filter((ep) => ep.series)
    .map((ep) => formatLatestEpisode(ep, ep.series));

  return {
    creator:           SITE_CREATOR,
    latest_release:   latestRelease,
    completed_donghua: completedSeries.map(formatSeries),
  };
};

// ─── Ongoing ─────────────────────────────────────────────────────────────────
const getOngoing = async ({ page, limit }) => {
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const filter = { ...DONGHUA_FILTER, ...Manga.getDiscoveryFilter(), status: 'ongoing' };

  const [items, total] = await Promise.all([
    Manga.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(perPage)
      .select('title slug coverImage status type alterTitle rating studio description genres totalEpisodes sourceUrl')
      .lean(),
    Manga.countDocuments(filter),
  ]);

  return {
    creator:         SITE_CREATOR,
    ongoing_donghua: items.map(formatSeries),
    meta: paginateMeta(total, currentPage, perPage),
  };
};

// ─── Completed ───────────────────────────────────────────────────────────────
const getCompleted = async ({ page, limit }) => {
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const filter = { ...DONGHUA_FILTER, ...Manga.getDiscoveryFilter(), status: 'completed' };

  const [items, total] = await Promise.all([
    Manga.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(perPage)
      .select('title slug coverImage status type alterTitle rating studio description genres totalEpisodes sourceUrl')
      .lean(),
    Manga.countDocuments(filter),
  ]);

  return {
    creator:           SITE_CREATOR,
    completed_donghua: items.map(formatSeries),
    meta: paginateMeta(total, currentPage, perPage),
  };
};

// ─── Search / Pencarian ──────────────────────────────────────────────────────
const search = async ({ q, page, limit }) => {
  if (!q || !q.trim()) throw new ApiError(400, 'Query parameter "q" is required');

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const filter = { ...DONGHUA_FILTER, $text: { $search: q.trim() } };

  const [items, total] = await Promise.all([
    Manga.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(perPage)
      .select('title slug coverImage status type alterTitle rating studio description genres totalEpisodes sourceUrl')
      .lean(),
    Manga.countDocuments(filter),
  ]);

  return {
    creator: SITE_CREATOR,
    query:   q.trim(),
    results: items.map(formatSeries),
    meta:    paginateMeta(total, currentPage, perPage),
  };
};

// ─── Detail ──────────────────────────────────────────────────────────────────
const getDetail = async (slug) => {
  const series = await Manga.findOneAndUpdate(
    { slug, type: { $in: DONGHUA_TYPES } },
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate('tags', 'name slug')
    .lean();

  if (!series) throw new ApiError(404, 'Donghua not found');

  // Fetch seasons + all episodes in parallel
  const [seasons, allEpisodes] = await Promise.all([
    Season.find({ series: series._id })
      .sort({ number: 1 })
      .select('number title year status episodeCount coverImage')
      .lean(),
    Episode.find({ series: series._id })
      .sort({ episodeNumber: -1 })
      .select('_id episodeNumber title slug sourceUrl')
      .lean(),
  ]);

  // Format genres with internal + external href (consistent slugify)
  const formattedGenres = (series.genres || []).map((g) => {
    const genreSlug = genreToSlug(g);
    return {
      name:       g,
      slug:       genreSlug,
      href:       `/donghua/genres/${genreSlug}`,
      anichinUrl: `https://anichin.cafe/genres/${genreSlug}/`,
    };
  });

  // Format episodes_list — use episode slug for href
  const episodesList = allEpisodes.map((ep) => ({
    episode:    ep.title || `${series.title} Episode ${ep.episodeNumber}`,
    slug:       ep.slug || null,
    href:       ep.slug ? `/donghua/episode/${ep.slug}` : `/donghua/${series.slug}/episodes/${ep._id}`,
    anichinUrl: ep.sourceUrl || null,
  }));

  // Determine year from first season (if any)
  const year = seasons.length > 0 ? (seasons[0].year || null) : null;

  return {
    status:         capitalizeStatus(series.status),
    creator:        series.creator || null,
    title:          series.title,
    alter_title:    series.alterTitle || null,
    slug:           series.slug,
    poster:         series.coverImage || null,
    rating:         series.rating ? String(series.rating) : '',
    studio:         series.studio || null,
    network:        series.network || null,
    released:       series.released || null,
    duration:       series.duration || null,
    type:           capitalizeType(series.type),
    episodes_count: String(allEpisodes.length),
    season:         year ? String(year) : null,
    country:        series.country || null,
    released_on:    series.releasedOn || null,
    updated_on:     series.updatedAt,
    synopsis:       series.description || '',
    genres:         formattedGenres,
    tags:           series.tags || [],
    seasons,
    episodes_list:  episodesList,
    href:           `/donghua/detail/${series.slug}`,
    sourceUrl:      series.sourceUrl || null,
    views:          series.views,
    ratingCount:    series.ratingCount,
    createdAt:      series.createdAt,
  };
};

// ─── Nonton Episode ──────────────────────────────────────────────────────────
const watchEpisode = async (episodeSlug) => {
  const episode = await Episode.findOne({ slug: episodeSlug })
    .populate('season', 'number title year')
    .populate('series', 'title slug coverImage type')
    .lean();

  if (!episode) throw new ApiError(404, 'Episode not found');
  if (!episode.series || !DONGHUA_TYPES.includes(episode.series.type)) {
    throw new ApiError(404, 'Donghua episode not found');
  }

  const series = episode.series;

  // Increment views async (fire and forget)
  Episode.findByIdAndUpdate(episode._id, { $inc: { views: 1 } }).lean().exec().catch(() => {});

  // Prev / Next navigation
  const [prev, next] = await Promise.all([
    Episode.findOne({ series: series._id, episodeNumber: { $lt: episode.episodeNumber } })
      .sort({ episodeNumber: -1 })
      .select('_id slug episodeNumber title')
      .lean(),
    Episode.findOne({ series: series._id, episodeNumber: { $gt: episode.episodeNumber } })
      .sort({ episodeNumber: 1 })
      .select('_id slug episodeNumber title')
      .lean(),
  ]);

  return {
    series: {
      title:  series.title,
      slug:   series.slug,
      poster: series.coverImage || null,
      href:   `/donghua/detail/${series.slug}`,
    },
    episode,
    navigation: { prev: prev || null, next: next || null },
  };
};

// H-9: Cache the distinct genres query — runs on every getByGenre request otherwise
const _getDistinctGenres = async () => {
  const cacheKey = 'donghua:genres:all';
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
  const names = await Manga.distinct('genres', DONGHUA_FILTER);
  await cache.set(cacheKey, names, 5 * 60);
  return names;
};

// ─── Daftar Genre ──────────────────────────────────────────────────────────────────────
const getGenres = async () => {
  const cacheKey = 'donghua:genres:list';
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const names = await _getDistinctGenres();
  const result = names.sort().map((name) => {
    const slug = slugify(name, { lower: true, strict: true });
    return {
      name,
      slug,
      href:       `/donghua/genres/${slug}`,
      anichinUrl: `https://anichin.cafe/genres/${slug}/`,
    };
  });

  await cache.set(cacheKey, result, 5 * 60);
  return result;
};

// ─── By Genre ────────────────────────────────────────────────────────────────
const getByGenre = async (genreSlug, { page, limit }) => {
  if (!genreSlug) throw new ApiError(400, 'Genre is required');

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  // H-9: Reuse cached genre list instead of running distinct on every request
  const allGenres = await _getDistinctGenres();
  const matchedName = allGenres.find(
    (name) => name.toLowerCase() === genreSlug.toLowerCase()
  ) || allGenres.find(
    (name) => slugify(name, { lower: true, strict: true }) === genreSlug
  );
  if (!matchedName) throw new ApiError(404, `Genre "${genreSlug}" not found`);

  const filter = { ...DONGHUA_FILTER, genres: { $in: [matchedName] } };

  const [items, total] = await Promise.all([
    Manga.find(filter)
      .sort({ rating: -1, updatedAt: -1 })
      .skip(skip)
      .limit(perPage)
      .select('title slug coverImage status type alterTitle rating studio description genres totalEpisodes sourceUrl')
      .lean(),
    Manga.countDocuments(filter),
  ]);

  return {
    creator: SITE_CREATOR,
    genre:   matchedName,
    donghua: items.map(formatSeries),
    meta:    paginateMeta(total, currentPage, perPage),
  };
};

// ─── By Season / Tahun ───────────────────────────────────────────────────────
const getByYear = async (year, { page, limit }) => {
  const parsedYear = parseInt(year, 10);
  if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
    throw new ApiError(400, 'Invalid year');
  }

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  // Match donghua that have at least one Season with the given year
  const seasonSeriesIds = await Season.distinct('series', { year: parsedYear });

  const filter = { ...DONGHUA_FILTER, _id: { $in: seasonSeriesIds } };

  const [items, total] = await Promise.all([
    Manga.find(filter)
      .sort({ rating: -1 })
      .skip(skip)
      .limit(perPage)
      .select('title slug coverImage status type alterTitle rating studio description genres totalEpisodes sourceUrl')
      .lean(),
    Manga.countDocuments(filter),
  ]);

  return {
    creator: SITE_CREATOR,
    year:    parsedYear,
    donghua: items.map(formatSeries),
    meta:    paginateMeta(total, currentPage, perPage),
  };
};

module.exports = {
  getHome,
  getOngoing,
  getCompleted,
  search,
  getDetail,
  watchEpisode,
  getGenres,
  getByGenre,
  getByYear,
};
