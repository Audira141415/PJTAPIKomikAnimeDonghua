'use strict';

jest.mock('../../../src/repositories/auth.repository');
jest.mock('../../../src/config/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

const jwt = require('jsonwebtoken');
const authRepo = require('../../../src/repositories/auth.repository');
const authService = require('../../../src/modules/auth/auth.service');
const { env } = require('../../../src/config/env');

const makeUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  username: 'user',
  email: 'user@example.com',
  role: 'user',
  isEmailVerified: true,
  comparePassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    return { _id: this._id, username: this.username, email: this.email, role: this.role };
  },
  ...overrides,
});

describe('auth.service extra flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authRepo.createRefreshToken.mockResolvedValue({});
  });

  it('login rejects unverified users', async () => {
    authRepo.findUserByEmail.mockResolvedValueOnce(makeUser({ isEmailVerified: false }));

    await expect(authService.login({ email: 'user@example.com', password: 'Password1!' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('refresh returns new access and refresh tokens for valid token', async () => {
    const user = makeUser();
    const rawRefresh = jwt.sign({ id: user._id }, env.JWT_REFRESH_SECRET, { expiresIn: '1h' });

    authRepo.findRefreshToken.mockResolvedValueOnce({ tokenHash: 'x', user: user._id });
    authRepo.findUserById.mockResolvedValueOnce(user);
    authRepo.deleteRefreshToken.mockResolvedValue({});

    const result = await authService.refresh(rawRefresh);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(authRepo.deleteRefreshToken).toHaveBeenCalled();
  });

  it('resetPassword invalidates all refresh tokens after password update', async () => {
    const user = makeUser();

    authRepo.findPasswordResetToken.mockResolvedValueOnce({ user: user._id });
    authRepo.findUserById.mockResolvedValueOnce(user);
    authRepo.deletePasswordResetToken.mockResolvedValueOnce({});
    authRepo.deleteRefreshTokensByUser.mockResolvedValueOnce({});

    await authService.resetPassword('raw-token', 'NewPassword1!');

    expect(user.save).toHaveBeenCalled();
    expect(authRepo.deleteRefreshTokensByUser).toHaveBeenCalledWith(user._id);
  });

  it('verifyEmail marks user as verified and removes verification token', async () => {
    authRepo.findEmailVerifyToken.mockResolvedValueOnce({ user: 'u1' });
    authRepo.updateUserById.mockResolvedValueOnce({ _id: 'u1', isEmailVerified: true });
    authRepo.deleteEmailVerifyToken.mockResolvedValueOnce({});

    await authService.verifyEmail('raw-token');

    expect(authRepo.updateUserById).toHaveBeenCalledWith('u1', { isEmailVerified: true });
    expect(authRepo.deleteEmailVerifyToken).toHaveBeenCalledWith('u1');
  });
});
