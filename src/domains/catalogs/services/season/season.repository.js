const {             Season             } = require('@models');

const create = (data) => Season.create(data);

const findBySeries = ({ seriesId, skip, limit }) =>
  Season.find({ series: seriesId })
    .sort({ number: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

const countBySeries = (seriesId) => Season.countDocuments({ series: seriesId });

const findById = (id) => Season.findById(id).lean();

const findOne = (filter) => Season.findOne(filter).lean();

const updateById = (id, data) =>
  Season.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const deleteById = (id) => Season.findByIdAndDelete(id);

/** Increment episodeCount by delta (1 on add, -1 on delete) */
const incrementEpisodeCount = (id, delta = 1) =>
  Season.findByIdAndUpdate(id, { $inc: { episodeCount: delta } }, { new: true });

module.exports = {
  create,
  findBySeries,
  countBySeries,
  findById,
  findOne,
  updateById,
  deleteById,
  incrementEpisodeCount,
};
