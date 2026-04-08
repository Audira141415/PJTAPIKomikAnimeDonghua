const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRepo = require('../../repositories/auth.repository');
const { env } = require('../../config/env');
const { sendMail } = require('../../config/mailer');
const ApiError = require('../../shared/errors/ApiError');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

const parseExpiry = (expiresIn) => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] || 86400000);
};

const saveRefreshToken = async (userId, rawToken) => {
  await authRepo.createRefreshToken({
    tokenHash: hashToken(rawToken),
    user: userId,
    expiresAt: new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN)),
  });
};

const register = async ({ username, email, password }) => {
  const existingUser = await authRepo.findUserByEmailOrUsername(email, username);
  if (existingUser) throw new ApiError(409, 'Email or username already taken');

  const user = await authRepo.createUser({ username, email, password });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await saveRefreshToken(user._id, refreshToken);

  // Fire-and-forget: does not block registration if SMTP not configured
  sendVerificationEmail(user).catch(() => {});

  return { user: user.toJSON(), accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await authRepo.findUserByEmail(email);
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // M-9: Reject unverified accounts — email verification is now enforced
  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before logging in. Check your inbox for the verification link.');
  }

  // H-3: Rotate out all prior refresh tokens — prevents indefinite accumulation
  await authRepo.deleteRefreshTokensByUser(user._id);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await saveRefreshToken(user._id, refreshToken);

  return { user: user.toJSON(), accessToken, refreshToken };
};

const refresh = async (token) => {
  const tokenHash = hashToken(token);
  const stored = await authRepo.findRefreshToken(tokenHash);
  if (!stored) throw new ApiError(401, 'Invalid refresh token');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    await authRepo.deleteRefreshToken(tokenHash);
    throw new ApiError(401, 'Expired or invalid refresh token');
  }

  const user = await authRepo.findUserById(payload.id);
  if (!user) {
    await authRepo.deleteRefreshToken(tokenHash);
    throw new ApiError(401, 'User not found');
  }

  await authRepo.deleteRefreshToken(tokenHash);

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  await saveRefreshToken(user._id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (token) => {
  await authRepo.deleteRefreshToken(hashToken(token));
};

// ── Password Reset ────────────────────────────────────────────────────────────

const forgotPassword = async (email) => {
  const user = await authRepo.findUserByEmail(email);
  // Always respond 200 to avoid email enumeration
  if (!user) return;

  await authRepo.deletePasswordResetByUser(user._id);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await authRepo.createPasswordResetToken({
    user: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  const resetUrl = `${env.APP_URL}/api/v1/auth/reset-password?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Password Reset Request',
    text: `Click the link to reset your password (expires in 1 hour):\n\n${resetUrl}`,
    html: `<p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};

const resetPassword = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);
  const record = await authRepo.findPasswordResetToken(tokenHash);
  if (!record) throw new ApiError(400, 'Invalid or expired password reset token');

  const user = await authRepo.findUserById(record.user);
  if (!user) throw new ApiError(400, 'User not found');

  user.password = newPassword; // pre-save hook will hash it
  await user.save();

  await authRepo.deletePasswordResetToken(tokenHash);
  // H-1: Invalidate all sessions — stolen refresh token survives no longer after password reset
  await authRepo.deleteRefreshTokensByUser(user._id);
};

// ── Email Verification ────────────────────────────────────────────────────────

const sendVerificationEmail = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await authRepo.upsertEmailVerifyToken(user._id, {
    user: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  const verifyUrl = `${env.APP_URL}/api/v1/auth/verify-email?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your email',
    text: `Please verify your email (expires in 24 hours):\n\n${verifyUrl}`,
    html: `<p>Please verify your email (expires in 24 hours):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
};

const verifyEmail = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  const record = await authRepo.findEmailVerifyToken(tokenHash);
  if (!record) throw new ApiError(400, 'Invalid or expired verification token');

  await authRepo.updateUserById(record.user, { isEmailVerified: true });
  await authRepo.deleteEmailVerifyToken(record.user);
};

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, sendVerificationEmail, verifyEmail };
