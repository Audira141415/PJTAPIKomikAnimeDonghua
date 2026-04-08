'use strict';

const Review = require('../models/Review');

const create = (data) => Review.create(data);

const findBySeries = ({ seriesId, skip, limit }) =>
  Review.find({ series: seriesId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username avatar displayName')
    .lean();

const findByUserPublic = ({ userId, skip, limit, sort = 'latest' }) => {
  const sortQuery = sort === 'top'
    ? { helpfulVotes: -1, createdAt: -1 }
    : { createdAt: -1 };

  return Review.find({ user: userId })
    .sort(sortQuery)
    .skip(skip)
    .limit(limit)
    .populate('series', 'title slug coverImage type status rating')
    .select('series body score helpfulVotes createdAt updatedAt')
    .lean();
};

const countBySeries = (seriesId) => Review.countDocuments({ series: seriesId });
const countByUser = (userId) => Review.countDocuments({ user: userId });

const findByUserAndSeries = (userId, seriesId) =>
  Review.findOne({ user: userId, series: seriesId }).lean();

const findById = (id) => Review.findById(id);

const updateById = (id, data) =>
  Review.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const deleteById = (id) => Review.findByIdAndDelete(id);

module.exports = {
  create,
  findBySeries,
  findByUserPublic,
  countBySeries,
  countByUser,
  findByUserAndSeries,
  findById,
  updateById,
  deleteById,
};
