const { Manga } = require('../models');
const slugify = require('slugify');
const cache = require('../shared/utils/cache');

/**
 * All Mongoose access for the Manga domain lives here.
 * Services receive plain objects (lean) or Mongoose docs — never direct Model access.
 *
 * Cache strategy (cache-aside):
 *  - findList  → cache key: manga:list:<stable-JSON-of-{filter,sort,skip,limit}>
 *  - findBySlug→ cache key: manga:slug:<slug>
 *  - Invalidate on create / updateById / deleteById
 */

/** Deterministic cache key from query params */
const listKey = (filter, sort, skip, limit) =>
  `manga:list:${JSON.stringify({ filter, sort, skip, limit })}`;

const create = async (data) => {
  const manga = await Manga.create(data);
  // Bust list cache — new item affects any listing
  await cache.delPattern('manga:list:*');
  return manga;
};

const findList = async ({ filter, sort, skip, limit }) => {
  const key = listKey(filter, sort, skip, limit);
  const cached = await cache.get(key);
  if (cached) return cached;

  const result = await Manga.find(filter).sort(sort).skip(skip).limit(limit).lean();
  await cache.set(key, result, cache.TTL.MANGA_LIST);
  return result;
};

const count = (filter) => Manga.countDocuments(filter);

const findBySlug = async (slug) => {
  const key = `manga:slug:${slug}`;
  const cached = await cache.get(key);
  if (cached) {
    // Still increment views in DB asynchronously (fire and forget)
    Manga.findOneAndUpdate({ slug }, { $inc: { views: 1 } }).lean().exec().catch(() => {});
    return cached;
  }

  const result = await Manga.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (result) await cache.set(key, result, cache.TTL.MANGA_DETAIL);
  return result;
};

const findById = (id) => Manga.findById(id).lean();

const updateById = async (id, data) => {
  // H-5: Recompute slug when title changes (findByIdAndUpdate bypasses pre-save hooks)
  if (data.title) {
    data.slug = slugify(data.title, { lower: true, strict: true });
  }
  const manga = await Manga.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (manga) {
    // Invalidate both the slug cache and all list caches
    await Promise.all([
      cache.del(`manga:slug:${manga.slug}`),
      cache.delPattern('manga:list:*'),
    ]);
  }
  return manga;
};

const deleteById = async (id) => {
  const manga = await Manga.findByIdAndDelete(id);
  if (manga) {
    await Promise.all([
      cache.del(`manga:slug:${manga.slug}`),
      cache.delPattern('manga:list:*'),
    ]);
  }
  return manga;
};

module.exports = { create, findList, count, findBySlug, findById, updateById, deleteById };
