const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** The series being consumed (Manga model — covers all types) */
    manga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manga',
      required: true,
    },
    /** Set for comic-type series (manga/manhwa/manhua) */
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      default: null,
    },
    /** Set for animation-type series (anime/donghua) */
    episode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Episode',
      default: null,
    },
    /** Discriminator so queries can filter by content class */
    contentType: {
      type: String,
      enum: ['comic', 'animation'],
      required: true,
    },
    /** Watch progress in seconds — only meaningful for animation */
    watchProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

historySchema.index({ user: 1, readAt: -1 });
// Compound index for contentType-filtered history queries (M-7)
historySchema.index({ user: 1, contentType: 1, readAt: -1 });
// Sparse unique indexes — each only applies when the field is non-null
historySchema.index(
  { user: 1, manga: 1, chapter: 1 },
  { unique: true, sparse: true, partialFilterExpression: { chapter: { $type: 'objectId' } } }
);
historySchema.index(
  { user: 1, manga: 1, episode: 1 },
  { unique: true, sparse: true, partialFilterExpression: { episode: { $type: 'objectId' } } }
);

module.exports = mongoose.model('History', historySchema);
