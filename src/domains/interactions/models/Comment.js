'use strict';

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    series:  { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true },
    // Optional context refs
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', default: null },
    // Threading
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    body:   { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    likes:  { type: Number, default: 0 },
    /** Users who liked this comment — for toggle and dedup */
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

commentSchema.index({ series: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ user: 1 });

module.exports = mongoose.model('Comment', commentSchema);
