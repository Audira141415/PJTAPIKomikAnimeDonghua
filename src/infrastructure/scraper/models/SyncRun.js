'use strict';

const mongoose = require('mongoose');

const syncRunSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'partial', 'failed'],
      default: 'pending',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: null,
    },
    fetchedCount: {
      type: Number,
      default: 0,
    },
    mappedCount: {
      type: Number,
      default: 0,
    },
    insertedCount: {
      type: Number,
      default: 0,
    },
    updatedCount: {
      type: Number,
      default: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    checksum: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    requestMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    responseMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

syncRunSchema.index({ sourceKey: 1, startedAt: -1 });

module.exports = mongoose.model('SyncRun', syncRunSchema);