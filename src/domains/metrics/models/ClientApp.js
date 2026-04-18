'use strict';

const mongoose = require('mongoose');

const clientAppSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    apiKeyHash: {
      type: String,
      required: true,
      select: false,
    },
    apiKeyPrefix: {
      type: String,
      required: true,
      index: true,
    },
    apiKeyHint: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: String,
      default: null,
      trim: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    totalRequests: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

clientAppSchema.index({ apiKeyPrefix: 1, status: 1 });

module.exports = mongoose.model('ClientApp', clientAppSchema);
