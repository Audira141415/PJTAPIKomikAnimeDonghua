const authService = require('./auth.service');
const authValidation = require('./auth.validation');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');

const register = catchAsync(async (req, res) => {
  const data = authValidation.register.parse(req.body);
  const result = await authService.register(data);
  success(res, { statusCode: 201, message: 'Registration successful', data: result });
});

const login = catchAsync(async (req, res) => {
  const data = authValidation.login.parse(req.body);
  const result = await authService.login(data);
  success(res, { message: 'Login successful', data: result });
});

const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = authValidation.refreshToken.parse(req.body);
  const result = await authService.refresh(refreshToken);
  success(res, { message: 'Token refreshed', data: result });
});

const logout = catchAsync(async (req, res) => {
  const { refreshToken } = authValidation.refreshToken.parse(req.body);
  await authService.logout(refreshToken);
  success(res, { message: 'Logged out successfully' });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = authValidation.forgotPassword.parse(req.body);
  await authService.forgotPassword(email);
  // Always 200 — avoid email enumeration
  success(res, { message: 'If an account with that email exists, a reset link has been sent' });
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = authValidation.resetPassword.parse(req.body);
  await authService.resetPassword(token, password);
  success(res, { message: 'Password reset successfully' });
});

const verifyEmail = catchAsync(async (req, res) => {
  const { token } = authValidation.verifyEmail.parse(req.query);
  await authService.verifyEmail(token);
  success(res, { message: 'Email verified successfully' });
});

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, verifyEmail };
