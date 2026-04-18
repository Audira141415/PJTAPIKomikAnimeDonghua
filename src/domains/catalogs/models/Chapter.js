const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    chapterNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    manga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manga',
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    mdChapterId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

chapterSchema.index({ manga: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ manga: 1, createdAt: -1 });

module.exports = mongoose.model('Chapter', chapterSchema);
