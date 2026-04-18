const {              Bookmark              } = require('@models');

const findOne = (userId, mangaId) =>
  Bookmark.findOne({ user: userId, manga: mangaId });

const create = (userId, mangaId) =>
  Bookmark.create({ user: userId, manga: mangaId });

const deleteOne = (id) => Bookmark.deleteOne({ _id: id });

const findByUser = ({ userId, skip, limit }) =>
  Bookmark.find({ user: userId })
    .populate('manga', 'title slug coverImage type status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

const countByUser = (userId) => Bookmark.countDocuments({ user: userId });

module.exports = { findOne, create, deleteOne, findByUser, countByUser };
