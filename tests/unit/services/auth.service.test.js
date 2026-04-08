'use strict';

jest.mock('../../../src/repositories/auth.repository');

const authRepo    = require('../../../src/repositories/auth.repository');
const authService = require('../../../src/modules/auth/auth.service');
const ApiError    = require('../../../src/shared/errors/ApiError');

// ── Minimal user mock ─────────────────────────────────────────────────────────
const makeUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  isEmailVerified: true, // M-9: Email verification enforced on login
  comparePassword: jest.fn().mockResolvedValue(true),
  toJSON() { return { _id: this._id, username: this.username, email: this.email, role: this.role }; },
  ...overrides,
});

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authRepo.createRefreshToken.mockResolvedValue({});
  });

  // ── register ────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('creates a user and returns tokens on success', async () => {
      authRepo.findUserByEmailOrUsername.mockResolvedValueOnce(null);
      authRepo.createUser.mockResolvedValueOnce(makeUser());

      const result = await authService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('throws ApiError 409 when email/username already taken', async () => {
      authRepo.findUserByEmailOrUsername.mockResolvedValueOnce(makeUser());

      await expect(
        authService.register({ username: 'dup', email: 'dup@example.com', password: 'Password1!' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const user = makeUser();
      authRepo.findUserByEmail.mockResolvedValueOnce(user);

      const result = await authService.login({ email: 'test@example.com', password: 'Password1!' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws ApiError 401 when user not found', async () => {
      authRepo.findUserByEmail.mockResolvedValueOnce(null);

      await expect(
        authService.login({ email: 'no@example.com', password: 'whatever' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws ApiError 401 when password is wrong', async () => {
      const user = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
      authRepo.findUserByEmail.mockResolvedValueOnce(user);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });
});
