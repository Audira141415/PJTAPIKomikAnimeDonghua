const {              Collection              } = require('@models');

const create = (payload) => Collection.create(payload);

const findById = (id) =>
  Collection.findById(id)
    .populate('items.manga', 'title slug coverImage type status rating views')
    .lean();

const findByIdForUpdate = (id) => Collection.findById(id);

const findByUser = async ({ userId, visibility, skip, limit }) => {
  const filter = { user: userId };
  if (visibility) filter.visibility = visibility;

  return Collection.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('items.manga', 'title slug coverImage type status rating views')
    .lean();
};

const findPublicByUser = ({ userId, skip, limit }) =>
  Collection.find({ user: userId, visibility: 'public' })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('items.manga', 'title slug coverImage type status rating views')
    .lean();

const findPublicById = (collectionId) =>
  Collection.findOne({ _id: collectionId, visibility: 'public' })
    .populate('items.manga', 'title slug coverImage type status rating views')
    .populate('user', 'username displayName avatar')
    .lean();

const countPublicByUser = (userId) =>
  Collection.countDocuments({ user: userId, visibility: 'public' });

const countByUser = ({ userId, visibility }) => {
  const filter = { user: userId };
  if (visibility) filter.visibility = visibility;
  return Collection.countDocuments(filter);
};

const updateById = (id, payload) =>
  Collection.findByIdAndUpdate(id, payload, { new: true, runValidators: true, context: 'query' })
    .populate('items.manga', 'title slug coverImage type status rating views')
    .lean();

const addItemIfMissing = (id, mangaId) =>
  Collection.findOneAndUpdate(
    { _id: id, 'items.manga': { $ne: mangaId } },
    { $push: { items: { manga: mangaId, addedAt: new Date() } } },
    { new: true }
  )
    .populate('items.manga', 'title slug coverImage type status rating views')
    .lean();

const findPublicTrending = (limit) =>
  Collection.aggregate([
    { $match: { visibility: 'public' } },
    { $addFields: { itemsCount: { $size: '$items' } } },
    { $sort: { itemsCount: -1, updatedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'owner',
      },
    },
    {
      $unwind: {
        path: '$owner',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'mangas',
        localField: 'items.manga',
        foreignField: '_id',
        as: 'mangaPreview',
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        visibility: 1,
        createdAt: 1,
        updatedAt: 1,
        itemsCount: 1,
        owner: {
          _id: '$owner._id',
          username: '$owner.username',
          displayName: '$owner.displayName',
          avatar: '$owner.avatar',
        },
        mangaPreview: {
          $map: {
            input: { $slice: ['$mangaPreview', 3] },
            as: 'manga',
            in: {
              _id: '$$manga._id',
              title: '$$manga.title',
              slug: '$$manga.slug',
              coverImage: '$$manga.coverImage',
              type: '$$manga.type',
              status: '$$manga.status',
              rating: '$$manga.rating',
            },
          },
        },
      },
    },
  ]);

const deleteById = (id) => Collection.deleteOne({ _id: id });

module.exports = {
  create,
  findById,
  findByIdForUpdate,
  findByUser,
  findPublicByUser,
  findPublicById,
  countByUser,
  countPublicByUser,
  updateById,
  addItemIfMissing,
  findPublicTrending,
  deleteById,
};
