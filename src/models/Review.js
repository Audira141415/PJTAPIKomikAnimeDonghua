'use strict';

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true },
    body:   { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    score:  { type: Number, required: true, min: 1, max: 10 },
    helpfulVotes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

reviewSchema.index({ user: 1, series: 1 }, { unique: true }); // one review per user per series
reviewSchema.index({ series: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
