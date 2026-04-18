const chapterService = require('./chapter.service');
const chapterValidation = require('./chapter.validation');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');

const create = catchAsync(async (req, res) => {
  const data = chapterValidation.createChapter.parse(req.body);
  const chapter = await chapterService.createChapter(data, req.files || []);
  success(res, { statusCode: 201, message: 'Chapter created', data: chapter });
});

const getByManga = catchAsync(async (req, res) => {
  const query = chapterValidation.queryChapters.parse(req.query);
  const result = await chapterService.getChaptersByManga(req.params.id, query);
  success(res, { data: result.chapters, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const chapter = await chapterService.getChapterById(req.params.id);
  success(res, { data: chapter });
});

const remove = catchAsync(async (req, res) => {
  await chapterService.deleteChapter(req.params.id);
  success(res, { message: 'Chapter deleted' });
});

const getImages = catchAsync(async (req, res) => {
  const result = await chapterService.getChapterImages(req.params.id);
  success(res, { data: result });
});

module.exports = { create, getByManga, getById, remove, getImages };
