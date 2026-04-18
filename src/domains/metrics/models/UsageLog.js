'use strict';

const mongoose = require('mongoose');

const NINETY_DAYS_IN_SECONDS = 90 * 24 * 60 * 60;

const usageLogSchema = new mongoose.Schema(
  {
    clientApp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientApp',
      default: null,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    originDomain: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    refererDomain: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    matchedBy: {
      type: String,
      enum: ['api-key', 'origin', 'referer', 'none'],
      default: 'none',
      index: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    statusCode: {
      type: Number,
      required: true,
      min: 100,
      max: 599,
    },
    durationMs: {
      type: Number,
      default: null,
      min: 0,
    },
    requestId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
      maxlength: 256,
    },
    ipAddress: {
      type: String,
      default: '',
      maxlength: 128,
    },
    day: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

usageLogSchema.index({ domain: 1, day: 1 });
usageLogSchema.index({ clientApp: 1, day: 1 });
usageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: NINETY_DAYS_IN_SECONDS });

module.exports = mongoose.model('UsageLog', usageLogSchema);
