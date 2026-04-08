const mongoose = require('mongoose');

const collectionItemSchema = new mongoose.Schema(
  {
    manga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manga',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const collectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
      index: true,
    },
    items: {
      type: [collectionItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1, name: 1 }, { unique: true });
collectionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Collection', collectionSchema);
