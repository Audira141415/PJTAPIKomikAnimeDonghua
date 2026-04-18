'use strict';

const mongoose = require('mongoose');

const rawSnapshotSchema = new mongoose.Schema(
  {
    sourceKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SourceFeed',
      default: null,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    snapshotKind: {
      type: String,
      required: true,
      enum: ['collection', 'series-detail', 'episode-detail', 'schedule', 'search', 'unknown'],
      index: true,
    },
    checksum: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    requestMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    responseMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    query: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    page: {
      type: Number,
      default: null,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    syncRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SyncRun',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

rawSnapshotSchema.index({ sourceKey: 1, endpoint: 1, capturedAt: -1 });

module.exports = mongoose.model('RawSnapshot', rawSnapshotSchema);