const mongoose = require('mongoose');

/**
 * Episode — the animation equivalent of Chapter.
 * Belongs to a series; optionally belongs to a Season.
 */

const streamUrlSchema = new mongoose.Schema(
  {
    quality: {
      type: String,
      enum: ['360p', '480p', '720p', '1080p'],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const subtitleSchema = new mongoose.Schema(
  {
    lang: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10, // e.g. 'id', 'en', 'jp', 'zh'
    },
    label: {
      type: String,
      trim: true,
      default: '',
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const episodeSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manga',
      required: true,
    },
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      default: null,
    },
    episodeNumber: {
      type: Number,
      required: true,
      min: 0, // 0 can represent OVA / specials
    },
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
    /** Unique episode slug for URL — e.g. "renegade-immortal-episode-135-subtitle-indonesia" */
    slug: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 3000,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    /** Duration in seconds */
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    streamUrls: {
      type: [streamUrlSchema],
      default: [],
    },
    subtitles: {
      type: [subtitleSchema],
      default: [],
    },
    isFiller: {
      type: Boolean,
      default: false,
    },
    releaseDate: {
      type: Date,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    /** Original source URL — e.g. anichin.cafe episode page */
    sourceUrl: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

// One series cannot have two episodes with the same number
episodeSchema.index({ series: 1, episodeNumber: 1 }, { unique: true });
episodeSchema.index({ series: 1, season: 1, episodeNumber: 1 });
episodeSchema.index({ series: 1, createdAt: -1 });
episodeSchema.index({ slug: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Episode', episodeSchema);
