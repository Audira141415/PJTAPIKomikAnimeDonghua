const bookmarkService = require('./bookmark.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { listBookmarks: listSchema } = require('./bookmark.validation');

const toggle = catchAsync(async (req, res) => {
  const result = await bookmarkService.toggleBookmark(req.user.id, req.params.mangaId);
  const message = result.bookmarked ? 'Bookmark added' : 'Bookmark removed';
  success(res, { message, data: result });
});

const getAll = catchAsync(async (req, res) => {
  const query = listSchema.parse(req.query);
  const result = await bookmarkService.getBookmarks(req.user.id, query);
  success(res, { data: result.bookmarks, meta: result.meta });
});

module.exports = { toggle, getAll };
