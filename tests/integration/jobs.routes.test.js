'use strict';

jest.mock('../../src/modules/jobs/jobs.service');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const jobsService = require('../../src/modules/jobs/jobs.service');

function bearer(role = 'admin') {
  const token = jwt.sign({ id: 'u1', role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

describe('jobs routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/jobs/health blocks non-authenticated request', async () => {
    const res = await request(app).get('/api/v1/jobs/health');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/jobs/health blocks non-admin user', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/health')
      .set('Authorization', bearer('user'));

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/jobs/health returns queue health for admin', async () => {
    jobsService.getQueueHealth.mockResolvedValueOnce({
      status: 'healthy',
      redis: 'ok',
      counts: { waiting: 1, failed: 0 },
    });

    const res = await request(app)
      .get('/api/v1/jobs/health')
      .set('Authorization', bearer('admin'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('POST /api/v1/jobs/retry/:jobId retries a failed job', async () => {
    jobsService.retryFailedJob.mockResolvedValueOnce({ retried: 1, job: { id: 'job-1' } });

    const res = await request(app)
      .post('/api/v1/jobs/retry/job-1')
      .set('Authorization', bearer('admin'));

    expect(res.status).toBe(200);
    expect(jobsService.retryFailedJob).toHaveBeenCalledWith('job-1');
    expect(res.body.data.retried).toBe(1);
  });
});
