const userService      = require('./user.service');
const catchAsync       = require('@core/utils/catchAsync');
const { success }      = require('@core/utils/response');
const { coverFileUrl } = require('@middlewares/upload.middleware');
const ApiError         = require('@core/errors/ApiError');
const { updateProfile: updateProfileSchema, publicFeedQuery: publicReviewFeedQuerySchema, publicCommentFeedQuery: publicCommentFeedQuerySchema } = require('./user.validation');

const getMe = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  success(res, { data: user });
});

const updateMe = catchAsync(async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await userService.updateProfile(req.user.id, data);
  success(res, { message: 'Profile updated', data: user });
});

const updateAvatar = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const avatarUrl = coverFileUrl(req.file);
  const user = await userService.updateAvatar(req.user.id, avatarUrl);
  success(res, { message: 'Avatar updated', data: user });
});

const getPublicProfile = catchAsync(async (req, res) => {
  const user = await userService.getPublicProfile(req.params.userId);
  success(res, { data: user });
});

const getPublicStats = catchAsync(async (req, res) => {
  const stats = await userService.getPublicStats(req.params.userId);
  success(res, { data: stats });
});

const getPublicReviews = catchAsync(async (req, res) => {
  const query = publicReviewFeedQuerySchema.parse(req.query);
  const result = await userService.getPublicReviewsByUser(req.params.userId, query);
  success(res, { data: result.reviews, meta: result.meta });
});

const getPublicComments = catchAsync(async (req, res) => {
  const query = publicCommentFeedQuerySchema.parse(req.query);
  const result = await userService.getPublicCommentsByUser(req.params.userId, query);
  success(res, { data: result.comments, meta: result.meta });
});

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
  getPublicProfile,
  getPublicStats,
  getPublicReviews,
  getPublicComments,
};
