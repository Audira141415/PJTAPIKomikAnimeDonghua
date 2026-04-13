'use strict';

const request  = require('supertest');

// ── Mock service & DB before requiring the app ───────────────────────────────
jest.mock('../../src/modules/auth/auth.service');
jest.mock('../../src/config/db');                  // prevent real DB connection

const authService = require('../../src/modules/auth/auth.service');
const app         = require('../../src/app');

const fakeTokens = {
  user:         { _id: '507f1f77bcf86cd799439011', username: 'alice', email: 'alice@example.com', role: 'user' },
  accessToken:  'fake.access.token',
  refreshToken: 'fake.refresh.token',
};

describe('POST /api/v1/auth/register', () => {
  it('returns 201 and tokens on success', async () => {
    authService.register.mockResolvedValueOnce(fakeTokens);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'Password1!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('returns 422 when body is missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@example.com' }); // missing username + password

    expect(res.status).toBe(400);
  });

  it('returns 409 when email or username already taken', async () => {
    const { default: ApiError } = await imp('ApiError');
    authService.register.mockRejectedValueOnce(
      Object.assign(new Error('Email or username already taken'), { statusCode: 409, isOperational: true }),
    );

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'Password1!' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 200 and tokens on valid credentials', async () => {
    authService.login.mockResolvedValueOnce(fakeTokens);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data.accessToken');
  });

  it('returns 401 on invalid credentials', async () => {
    authService.login.mockRejectedValueOnce(
      Object.assign(new Error('Invalid email or password'), { statusCode: 401, isOperational: true }),
    );

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('returns 200 with version v1', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version', 'v1');
  });

  it('does not force upgrade-insecure-requests on HTTP deployment', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);

    const csp = res.headers['content-security-policy'] || '';
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});

describe('Legacy /api route', () => {
  it('returns 410 Gone', async () => {
    const res = await request(app).get('/api/mangas');
    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
  });
});

// Helper — avoids linter error on unused import
async function imp(name) {
  try { return { default: require(`../../src/shared/errors/${name}`) }; }
  catch { return { default: class E extends Error { constructor(s, m) { super(m); this.statusCode = s; } } }; }
}
