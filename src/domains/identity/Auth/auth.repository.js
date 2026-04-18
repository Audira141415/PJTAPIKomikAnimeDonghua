const {             User, RefreshToken             } = require('@models');
const {            PasswordResetToken            } = require('@models');
const {            EmailVerificationToken            } = require('@models');

// ── User ─────────────────────────────────────────────────────────────────────

const findUserByEmailOrUsername = (email, username) =>
  User.findOne({ $or: [{ email }, { username }] });

const findUserByEmail = (email) =>
  User.findOne({ email }).select('+password');

const findUserById = (id) => User.findById(id);

const createUser = (data) => User.create(data);

const updateUserById = (id, data) => User.findByIdAndUpdate(id, data, { new: true });

// ── RefreshToken ──────────────────────────────────────────────────────────────

const createRefreshToken = (data) => RefreshToken.create(data);

const findRefreshToken = (tokenHash) => RefreshToken.findOne({ tokenHash });

const deleteRefreshToken = (tokenHash) => RefreshToken.deleteOne({ tokenHash });

const deleteRefreshTokensByUser = (userId) => RefreshToken.deleteMany({ user: userId });

// ── PasswordResetToken ────────────────────────────────────────────────────────

const createPasswordResetToken = (data) => PasswordResetToken.create(data);

const findPasswordResetToken = (tokenHash) =>
  PasswordResetToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } });

const deletePasswordResetToken = (tokenHash) =>
  PasswordResetToken.deleteOne({ tokenHash });

const deletePasswordResetByUser = (userId) =>
  PasswordResetToken.deleteMany({ user: userId });

// ── EmailVerificationToken ────────────────────────────────────────────────────

const upsertEmailVerifyToken = (userId, data) =>
  EmailVerificationToken.findOneAndUpdate({ user: userId }, data, { upsert: true, new: true });

const findEmailVerifyToken = (tokenHash) =>
  EmailVerificationToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } });

const deleteEmailVerifyToken = (userId) =>
  EmailVerificationToken.deleteOne({ user: userId });

module.exports = {
  findUserByEmailOrUsername,
  findUserByEmail,
  findUserById,
  createUser,
  updateUserById,
  createRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteRefreshTokensByUser,
  createPasswordResetToken,
  findPasswordResetToken,
  deletePasswordResetToken,
  deletePasswordResetByUser,
  upsertEmailVerifyToken,
  findEmailVerifyToken,
  deleteEmailVerifyToken,
};
