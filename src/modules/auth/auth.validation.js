const { z } = require('zod');

const register = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const login = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const refreshToken = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPassword = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
});

const resetPassword = z.object({
  token:    z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const verifyEmail = z.object({
  token: z.string().min(1, 'Token is required'),
});

module.exports = { register, login, refreshToken, forgotPassword, resetPassword, verifyEmail };
