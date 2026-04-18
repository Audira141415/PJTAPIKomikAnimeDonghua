const { collectionRepository: collectionRepo } = require('@repositories');
const { mangaRepository: mangaRepo } = require('@repositories');
const ApiError = require('@core/errors/ApiError');
const { paginate, paginateMeta } = require('@core/utils/paginate');
const cache = require('@core/utils/cache');

const PUBLIC_DISCOVERY_TTL = 2 * 60;

const invalidatePublicDiscoveryCache = async () => {
  await Promise.all([
    cache.delPattern('public:collections:user:*'),
    cache.delPattern('public:collections:trending:*'),
    cache.delPattern('public:collections:detail:*'),
    cache.delPattern('public:user:stats:*'),
  ]);
};

const ensureOwnerCollection = async (collectionId, userId) => {
  const collection = await collectionRepo.findByIdForUpdate(collectionId);
  if (!collection) {
    throw new ApiError(404, 'Collection not found');
  }

  if (String(collection.user) !== String(userId)) {
    throw new ApiError(403, 'Forbidden: collection does not belong to current user');
  }

  return collection;
};

const createCollection = async (userId, payload) => {
  try {
    const collection = await collectionRepo.create({ user: userId, ...payload });
    await invalidatePublicDiscoveryCache();
    return collection;
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ApiError(409, 'Collection name already exists for this user');
    }
    throw error;
  }
};

const listCollections = async (userId, query) => {
  const { page, limit, visibility } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [collections, total] = await Promise.all([
    collectionRepo.findByUser({ userId, visibility, skip, limit: perPage }),
    collectionRepo.countByUser({ userId, visibility }),
  ]);

  return { collections, meta: paginateMeta(total, currentPage, perPage) };
};

const listPublicCollectionsByUser = async (userId, query) => {
  const { page, limit } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const cacheKey = `public:collections:user:${userId}:page:${currentPage}:limit:${perPage}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const [collections, total] = await Promise.all([
    collectionRepo.findPublicByUser({ userId, skip, limit: perPage }),
    collectionRepo.countPublicByUser(userId),
  ]);

  const payload = { collections, meta: paginateMeta(total, currentPage, perPage) };
  await cache.set(cacheKey, payload, PUBLIC_DISCOVERY_TTL);
  return payload;
};

const getPublicTrendingCollections = async ({ limit }) => {
  const cacheKey = `public:collections:trending:limit:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const collections = await collectionRepo.findPublicTrending(limit);
  const payload = {
    collections,
    meta: {
      limit,
      count: collections.length,
    },
  };

  await cache.set(cacheKey, payload, PUBLIC_DISCOVERY_TTL);
  return payload;
};

const getPublicCollectionById = async (collectionId) => {
  const cacheKey = `public:collections:detail:${collectionId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const collection = await collectionRepo.findPublicById(collectionId);
  if (!collection) {
    throw new ApiError(404, 'Public collection not found');
  }

  await cache.set(cacheKey, collection, PUBLIC_DISCOVERY_TTL);
  return collection;
};

const getCollectionById = async (collectionId, userId) => {
  const collection = await collectionRepo.findById(collectionId);
  if (!collection) {
    throw new ApiError(404, 'Collection not found');
  }

  if (String(collection.user) !== String(userId)) {
    throw new ApiError(403, 'Forbidden: collection does not belong to current user');
  }

  return collection;
};

const updateCollection = async (collectionId, userId, payload) => {
  await ensureOwnerCollection(collectionId, userId);

  try {
    const updatedCollection = await collectionRepo.updateById(collectionId, payload);
    await invalidatePublicDiscoveryCache();
    return updatedCollection;
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ApiError(409, 'Collection name already exists for this user');
    }
    throw error;
  }
};

const deleteCollection = async (collectionId, userId) => {
  await ensureOwnerCollection(collectionId, userId);
  await collectionRepo.deleteById(collectionId);
  await invalidatePublicDiscoveryCache();
  return { deleted: true };
};

const addItemToCollection = async (collectionId, userId, mangaId) => {
  await ensureOwnerCollection(collectionId, userId);
  const manga = await mangaRepo.findById(mangaId);

  if (!manga) {
    throw new ApiError(404, 'Manga not found');
  }

  const updatedCollection = await collectionRepo.addItemIfMissing(collectionId, mangaId);
  if (!updatedCollection) {
    throw new ApiError(409, 'Manga already exists in this collection');
  }

  await invalidatePublicDiscoveryCache();
  return updatedCollection;
};

const removeItemFromCollection = async (collectionId, userId, mangaId) => {
  const collection = await ensureOwnerCollection(collectionId, userId);

  const originalLength = collection.items.length;
  collection.items = collection.items.filter((item) => String(item.manga) !== String(mangaId));

  if (collection.items.length === originalLength) {
    throw new ApiError(404, 'Manga is not in this collection');
  }

  await collection.save();
  await invalidatePublicDiscoveryCache();
  return collectionRepo.findById(collectionId);
};

module.exports = {
  createCollection,
  listCollections,
  listPublicCollectionsByUser,
  getPublicTrendingCollections,
  getPublicCollectionById,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addItemToCollection,
  removeItemFromCollection,
};
