const {             Rating, Manga             } = require('@models');

/**
 * Upsert a user's rating for a series.
 * Returns { previousScore, newScore, series } for the caller to react to.
 */
const upsertRating = async (userId, seriesId, score) => {
  // Find existing rating (if any)
  const existing = await Rating.findOne({ user: userId, series: seriesId }).lean();
  const previousScore = existing ? existing.score : null;

  // Upsert the Rating document
  await Rating.findOneAndUpdate(
    { user: userId, series: seriesId },
    { score },
    { upsert: true, new: true, runValidators: true }
  );

  // Recalculate series average using MongoDB aggregation
  const [agg] = await Rating.aggregate([
    { $match: { series: seriesId } },
    { $group: { _id: '$series', avg: { $avg: '$score' }, count: { $sum: 1 } } },
  ]);

  const newAvg   = agg ? Math.round(agg.avg * 10) / 10 : 0;
  const newCount = agg ? agg.count : 0;

  await Manga.findByIdAndUpdate(seriesId, {
    rating:      newAvg,
    ratingCount: newCount,
  });

  return { previousScore, newScore: score, newAvg, ratingCount: newCount };
};

const findByUserAndSeries = (userId, seriesId) =>
  Rating.findOne({ user: userId, series: seriesId }).lean();

module.exports = { upsertRating, findByUserAndSeries };
