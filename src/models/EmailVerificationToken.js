'use strict';

const mongoose = require('mongoose');

const emailVerifySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

emailVerifySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-cleanup

module.exports = mongoose.model('EmailVerificationToken', emailVerifySchema);
