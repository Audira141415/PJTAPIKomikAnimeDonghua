'use strict';

const mongoose = require('mongoose');

const sourceFeedSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ['comic', 'anime', 'donghua', 'mixed', 'other'],
      default: 'mixed',
      index: true,
    },
    baseUrl: {
      type: String,
      required: true,
      trim: true,
    },
    endpoint: {
      type: String,
      default: null,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 100,
      min: 0,
      index: true,
    },
    defaultType: {
      type: String,
      enum: ['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona'],
      default: 'anime',
    },
    syncStrategy: {
      type: String,
      enum: ['collection', 'detail', 'hybrid'],
      default: 'hybrid',
    },
    notes: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

sourceFeedSchema.index({ enabled: 1, priority: 1 });

module.exports = mongoose.model('SourceFeed', sourceFeedSchema);