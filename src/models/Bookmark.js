const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    manga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manga',
      required: true,
    },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, manga: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
