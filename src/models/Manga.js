const mongoose = require('mongoose');
const slugify = require('slugify');

const mangaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    /** Alternative / romanized title — e.g. "Xiao Xian Zhi Yao" */
    alterTitle: {
      type: String,
      default: null,
      trim: true,
      maxlength: 300,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona'],
      required: true,
    },
    /** Category derived from type — 'comic' or 'animation'. Set automatically. */
    contentCategory: {
      type: String,
      enum: ['comic', 'animation'],
      required: true,
      default: 'comic',
    },
    genres: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    artist: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    /** Studio name — primarily used for anime / donghua */
    studio: {
      type: String,
      default: null,
      trim: true,
    },
    /** Subtitle/dub indicator — e.g. "Sub", "Dub", "Sub | Dub" */
    sub: {
      type: String,
      default: 'Sub',
      trim: true,
    },
    /** Creator / subber credit — e.g. "Audira" */
    creator: {
      type: String,
      default: null,
      trim: true,
    },
    /** Short release date string — e.g. "Sep 25, 2023" (from scraper) */
    released: {
      type: String,
      default: null,
      trim: true,
    },
    /** Episode duration string — e.g. "25 min. per ep" */
    duration: {
      type: String,
      default: null,
      trim: true,
    },
    /** Streaming network / platform — e.g. iQiYi, Bilibili, WeTV */
    network: {
      type: String,
      default: null,
      trim: true,
    },
    /** Country of origin — e.g. China, Japan, Korea */
    country: {
      type: String,
      default: null,
      trim: true,
    },
    /** First release / air date */
    releasedOn: {
      type: Date,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'hiatus', 'cancelled', 'upcoming'],
      default: 'ongoing',
    },
    /** Computed average of all user Rating documents — updated on each rating upsert */
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** Referenced Tag documents */
    tags: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
      default: [],
    },
    /** Total episode count (null = unknown / "?") */
    totalEpisodes: {
      type: Number,
      default: null,
    },
    /** Original source URL — e.g. anichin.cafe series page */
    sourceUrl: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

mangaSchema.index({ title: 'text' });
mangaSchema.index({ type: 1, status: 1 });
mangaSchema.index({ genres: 1 });
// Compound indexes for common filter+sort access patterns (M-6)
mangaSchema.index({ type: 1, rating: -1 });
mangaSchema.index({ type: 1, views: -1 });
mangaSchema.index({ status: 1, rating: -1 });
mangaSchema.index({ contentCategory: 1, rating: -1 });

const ANIMATION_TYPES = ['anime', 'donghua', 'movie', 'ona'];

mangaSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  // Keep contentCategory in sync with type
  if (this.isModified('type') || this.isNew) {
    this.contentCategory = ANIMATION_TYPES.includes(this.type) ? 'animation' : 'comic';
  }
  next();
});

module.exports = mongoose.model('Manga', mangaSchema);
