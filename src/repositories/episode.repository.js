const { Episode } = require('../models');

const create = (data) => Episode.create(data);

const findBySeries = ({ seriesId, seasonId, skip, limit }) => {
  const filter = { series: seriesId };
  if (seasonId) filter.season = seasonId;
  return Episode.find(filter)
    .sort({ episodeNumber: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countBySeries = ({ seriesId, seasonId }) => {
  const filter = { series: seriesId };
  if (seasonId) filter.season = seasonId;
  return Episode.countDocuments(filter);
};

const findById = (id) => Episode.findById(id).lean();

const findOne = (filter) => Episode.findOne(filter).lean();

const updateById = (id, data) =>
  Episode.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const deleteById = (id) => Episode.findByIdAndDelete(id);

const incrementViews = (id) =>
  Episode.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).lean();

module.exports = {
  create,
  findBySeries,
  countBySeries,
  findById,
  findOne,
  updateById,
  deleteById,
  incrementViews,
};
