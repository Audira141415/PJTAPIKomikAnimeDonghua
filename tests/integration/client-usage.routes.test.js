'use strict';

jest.mock('../../src/modules/client-usage/clientUsage.service');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const clientUsageService = require('../../src/modules/client-usage/clientUsage.service');

function bearer(role = 'admin') {
  const token = jwt.sign({ id: 'u1', role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

describe('client-usage routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/v1/client-usage/clients blocks unauthenticated access', async () => {
    const res = await request(app)
      .post('/api/v1/client-usage/clients')
      .send({ name: 'Web A', domain: 'weba.example.com' });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/client-usage/clients blocks non-admin access', async () => {
    const res = await request(app)
      .post('/api/v1/client-usage/clients')
      .set('Authorization', bearer('user'))
      .send({ name: 'Web A', domain: 'weba.example.com' });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/client-usage/clients creates client app', async () => {
    clientUsageService.createClientApp.mockResolvedValueOnce({
      client: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Web A',
        domain: 'weba.example.com',
        apiKeyHint: 'a1b2c3',
        status: 'active',
      },
      apiKey: 'full-secret-api-key',
    });

    const res = await request(app)
      .post('/api/v1/client-usage/clients')
      .set('Authorization', bearer('admin'))
      .send({ name: 'Web A', domain: 'weba.example.com' });

    expect(res.status).toBe(201);
    expect(clientUsageService.createClientApp).toHaveBeenCalledWith({
      name: 'Web A',
      domain: 'weba.example.com',
      createdBy: 'u1',
    });
    expect(res.body.success).toBe(true);
    expect(res.body.data.client.domain).toBe('weba.example.com');
  });

  it('GET /api/v1/client-usage/reports/top-websites returns ranking', async () => {
    clientUsageService.getTopWebsites.mockResolvedValueOnce([
      { domain: 'weba.example.com', requestCount: 120 },
      { domain: 'webb.example.com', requestCount: 90 },
    ]);

    const res = await request(app)
      .get('/api/v1/client-usage/reports/top-websites')
      .set('Authorization', bearer('admin'))
      .query({ days: 7, limit: 2 });

    expect(res.status).toBe(200);
    expect(clientUsageService.getTopWebsites).toHaveBeenCalledWith({ days: 7, limit: 2 });
    expect(res.body.data).toHaveLength(2);
  });

  it('GET /api/v1/client-usage/reports/daily-domain-usage returns per-day usage', async () => {
    clientUsageService.getDailyDomainUsage.mockResolvedValueOnce([
      { day: '2026-04-15', domain: 'weba.example.com', requestCount: 44 },
    ]);

    const res = await request(app)
      .get('/api/v1/client-usage/reports/daily-domain-usage')
      .set('Authorization', bearer('admin'))
      .query({ days: 30, limit: 50 });

    expect(res.status).toBe(200);
    expect(clientUsageService.getDailyDomainUsage).toHaveBeenCalledWith({ days: 30, limit: 50 });
    expect(res.body.data[0].domain).toBe('weba.example.com');
  });

  it('GET /api/v1/client-usage/reports/dashboard returns compact dashboard summary', async () => {
    clientUsageService.getDashboardSummary.mockResolvedValueOnce({
      periodDays: 7,
      totalRequests: 200,
      activeClients: 5,
      dailyTotals: [{ day: '2026-04-15', requestCount: 80 }],
      topWebsites: [{ domain: 'weba.example.com', requestCount: 120 }],
    });

    const res = await request(app)
      .get('/api/v1/client-usage/reports/dashboard')
      .set('Authorization', bearer('admin'))
      .query({ days: 7, includeUnknown: true });

    expect(res.status).toBe(200);
    expect(clientUsageService.getDashboardSummary).toHaveBeenCalledWith({ days: 7, includeUnknown: true });
    expect(res.body.data.totalRequests).toBe(200);
  });
});
