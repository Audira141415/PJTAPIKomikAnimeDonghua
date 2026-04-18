const {              Chapter              } = require('@models');

const create = (data) => Chapter.create(data);

const findOne = (filter) => Chapter.findOne(filter);

const findList = ({ mangaId, skip, limit }) =>
  Chapter.find({ manga: mangaId }).sort({ chapterNumber: 1 }).skip(skip).limit(limit).lean();

const count = (mangaId) => Chapter.countDocuments({ manga: mangaId });

const findById = (id) =>
  Chapter.findById(id).populate('manga', 'title slug').lean();

const deleteById = (id) => Chapter.findByIdAndDelete(id);

const save = (doc) => doc.save();

module.exports = { create, findOne, findList, count, findById, deleteById, save };
