const { userRepository: userRepo } = require('@repositories');
const {             Review, Comment, Collection             } = require('@models');
const { reviewRepository: reviewRepo } = require('@repositories');
const { commentRepository: commentRepo } = require('@repositories');
const ApiError = require('@core/errors/ApiError');
const cache = require('@core/utils/cache');
const { paginate, paginateMeta } = require('@core/utils/paginate');

const PUBLIC_DISCOVERY_TTL = 2 * 60;

const invalidatePublicUserCache = async (userId) => {
  await Promise.all([
    cache.del(`public:user:profile:${userId}`),
    cache.del(`public:user:stats:${userId}`),
    cache.delPattern(`public:user:reviews:${userId}:*`),
    cache.delPattern(`public:user:comments:${userId}:*`),
  ]);
};

const getProfile = async (userId) => {
  const user = await userRepo.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const updateProfile = async (userId, data) => {
  // Only allow safe fields — never update role/password/email through this endpoint
  const allowed = ['username', 'bio', 'displayName'];
  const update = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key)),
  );
  const user = await userRepo.updateById(userId, update);
  if (!user) throw new ApiError(404, 'User not found');
  await invalidatePublicUserCache(userId);
  return user;
};

const updateAvatar = async (userId, avatarUrl) => {
  const user = await userRepo.updateById(userId, { avatar: avatarUrl });
  if (!user) throw new ApiError(404, 'User not found');
  await invalidatePublicUserCache(userId);
  return user;
};

const getPublicProfile = async (userId) => {
  const cacheKey = `public:user:profile:${userId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const user = await userRepo.findPublicById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  await cache.set(cacheKey, user, PUBLIC_DISCOVERY_TTL);
  return user;
};

const getPublicStats = async (userId) => {
  const cacheKey = `public:user:stats:${userId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const user = await userRepo.findPublicById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const [reviews, comments, publicCollections] = await Promise.all([
    Review.countDocuments({ user: userId }),
    Comment.countDocuments({ user: userId, isDeleted: false }),
    Collection.countDocuments({ user: userId, visibility: 'public' }),
  ]);

  const payload = {
    reviews,
    comments,
    collections: {
      public: publicCollections,
    },
  };

  await cache.set(cacheKey, payload, PUBLIC_DISCOVERY_TTL);
  return payload;
};

const getPublicReviewsByUser = async (userId, query) => {
  const user = await userRepo.findPublicById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const { page, limit, sort } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const cacheKey = `public:user:reviews:${userId}:sort:${sort}:page:${currentPage}:limit:${perPage}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const [reviews, total] = await Promise.all([
    reviewRepo.findByUserPublic({ userId, skip, limit: perPage, sort }),
    reviewRepo.countByUser(userId),
  ]);

  const payload = {
    reviews,
    meta: paginateMeta(total, currentPage, perPage),
  };

  await cache.set(cacheKey, payload, PUBLIC_DISCOVERY_TTL);
  return payload;
};

const getPublicCommentsByUser = async (userId, query) => {
  const user = await userRepo.findPublicById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const { page, limit, sort } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const cacheKey = `public:user:comments:${userId}:sort:${sort}:page:${currentPage}:limit:${perPage}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const [comments, total] = await Promise.all([
    commentRepo.findByUserPublic({ userId, skip, limit: perPage, sort }),
    commentRepo.countByUser(userId),
  ]);

  const payload = {
    comments,
    meta: paginateMeta(total, currentPage, perPage),
  };

  await cache.set(cacheKey, payload, PUBLIC_DISCOVERY_TTL);
  return payload;
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  getPublicProfile,
  getPublicStats,
  getPublicReviewsByUser,
  getPublicCommentsByUser,
};
