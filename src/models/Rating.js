const mongoose = require('mongoose');

/**
 * Rating — one score per user per series.
 * score range: 1–10.
 * The service upserts this record and then recalculates the series' average rating.
 */
const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manga',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
  },
  { timestamps: true }
);

// One user can rate a series only once (upsert updates existing)
ratingSchema.index({ user: 1, series: 1 }, { unique: true });
ratingSchema.index({ series: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
