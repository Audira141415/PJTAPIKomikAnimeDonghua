const collectionService = require('./collection.service');
const collectionValidation = require('./collection.validation');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');

const create = catchAsync(async (req, res) => {
  const data = collectionValidation.createCollection.parse(req.body);
  const collection = await collectionService.createCollection(req.user.id, data);

  success(res, {
    statusCode: 201,
    message: 'Collection created',
    data: collection,
  });
});

const getAll = catchAsync(async (req, res) => {
  const query = collectionValidation.listCollections.parse(req.query);
  const result = await collectionService.listCollections(req.user.id, query);

  success(res, {
    data: result.collections,
    meta: result.meta,
  });
});

const getPublicByUser = catchAsync(async (req, res) => {
  const query = collectionValidation.listPublicCollections.parse(req.query);
  const result = await collectionService.listPublicCollectionsByUser(req.params.userId, query);

  success(res, {
    data: result.collections,
    meta: result.meta,
  });
});

const getPublicTrending = catchAsync(async (req, res) => {
  const query = collectionValidation.publicTrending.parse(req.query);
  const result = await collectionService.getPublicTrendingCollections(query);

  success(res, {
    data: result.collections,
    meta: result.meta,
  });
});

const getPublicById = catchAsync(async (req, res) => {
  const collection = await collectionService.getPublicCollectionById(req.params.collectionId);
  success(res, { data: collection });
});

const getById = catchAsync(async (req, res) => {
  const collection = await collectionService.getCollectionById(req.params.collectionId, req.user.id);
  success(res, { data: collection });
});

const update = catchAsync(async (req, res) => {
  const data = collectionValidation.updateCollection.parse(req.body);
  const collection = await collectionService.updateCollection(req.params.collectionId, req.user.id, data);

  success(res, {
    message: 'Collection updated',
    data: collection,
  });
});

const remove = catchAsync(async (req, res) => {
  await collectionService.deleteCollection(req.params.collectionId, req.user.id);
  success(res, {
    message: 'Collection deleted',
    data: null,
  });
});

const addItem = catchAsync(async (req, res) => {
  const { mangaId } = collectionValidation.addItem.parse(req.body);
  const collection = await collectionService.addItemToCollection(req.params.collectionId, req.user.id, mangaId);

  success(res, {
    message: 'Manga added to collection',
    data: collection,
  });
});

const removeItem = catchAsync(async (req, res) => {
  const collection = await collectionService.removeItemFromCollection(
    req.params.collectionId,
    req.user.id,
    req.params.mangaId
  );

  success(res, {
    message: 'Manga removed from collection',
    data: collection,
  });
});

module.exports = {
  create,
  getAll,
  getPublicByUser,
  getPublicTrending,
  getPublicById,
  getById,
  update,
  remove,
  addItem,
  removeItem,
};
