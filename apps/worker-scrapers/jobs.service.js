'use strict';

const ApiError = require('@core/errors/ApiError');

function getQueueContext() {
  try {
    // Lazy require so API can boot even when REDIS_URL is not configured.
    // Endpoint will return degraded/down status instead of crashing app boot.
    const { scraperQueue, connection } = require('../../jobs/queue'); // eslint-disable-line global-require
    return { scraperQueue, connection, error: null };
  } catch (err) {
    return { scraperQueue: null, connection: null, error: err };
  }
}

function mapJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    name: job.name,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason || null,
    timestamp: job.timestamp || null,
    processedOn: job.processedOn || null,
    finishedOn: job.finishedOn || null,
    data: job.data || {},
  };
}

async function getQueueHealth() {
  const { scraperQueue, connection, error } = getQueueContext();
  if (error || !scraperQueue || !connection) {
    return {
      status: 'down',
      redis: 'unavailable',
      reason: error?.message || 'Queue subsystem is not configured',
      counts: null,
    };
  }

  let redis = 'ok';
  try {
    const pong = await connection.ping();
    redis = pong === 'PONG' ? 'ok' : 'degraded';
  } catch {
    redis = 'down';
  }

  const counts = await scraperQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused'
  );

  const status = redis === 'ok' ? 'healthy' : 'degraded';
  return { status, redis, counts };
}

async function getQueueDashboard(limit = 20) {
  const { scraperQueue, error } = getQueueContext();
  if (error || !scraperQueue) {
    throw new ApiError(503, error?.message || 'Queue subsystem is not configured');
  }

  const counts = await scraperQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused'
  );

  const failedJobs = await scraperQueue.getJobs(['failed'], 0, limit - 1, true);
  const activeJobs = await scraperQueue.getJobs(['active'], 0, Math.min(limit - 1, 9), true);

  return {
    counts,
    failedJobs: failedJobs.map(mapJob),
    activeJobs: activeJobs.map(mapJob),
  };
}

async function retryFailedJob(jobId) {
  const { scraperQueue, error } = getQueueContext();
  if (error || !scraperQueue) {
    throw new ApiError(503, error?.message || 'Queue subsystem is not configured');
  }

  const job = await scraperQueue.getJob(jobId);
  if (!job) throw new ApiError(404, 'Failed job not found');

  await job.retry();
  return { retried: 1, job: mapJob(job) };
}

async function retryFailedJobs(limit = 50) {
  const { scraperQueue, error } = getQueueContext();
  if (error || !scraperQueue) {
    throw new ApiError(503, error?.message || 'Queue subsystem is not configured');
  }

  const failedJobs = await scraperQueue.getJobs(['failed'], 0, limit - 1, true);

  let retried = 0;
  let failed = 0;

  for (const job of failedJobs) {
    try {
      await job.retry();
      retried += 1;
    } catch {
      failed += 1;
    }
  }

  return { requested: failedJobs.length, retried, failed };
}

async function removeFailedJob(jobId) {
  const { scraperQueue, error } = getQueueContext();
  if (error || !scraperQueue) {
    throw new ApiError(503, error?.message || 'Queue subsystem is not configured');
  }

  const job = await scraperQueue.getJob(jobId);
  if (!job) throw new ApiError(404, 'Failed job not found');

  await job.remove();
  return { removed: true, jobId };
}

async function enqueueEndpointMonitor(requestedBy = null) {
  const { scraperQueue, error } = getQueueContext();
  if (error || !scraperQueue) {
    throw new ApiError(503, error?.message || 'Queue subsystem is not configured');
  }

  const job = await scraperQueue.add(
    'endpoint-monitor',
    {
      requestedBy: requestedBy || null,
      triggeredAt: new Date().toISOString(),
      trigger: 'manual',
    },
    {
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  );

  const state = await job.getState();
  return {
    queued: true,
    job: {
      id: job.id,
      name: job.name,
      state,
    },
  };
}

async function enqueueMirroring(requestedBy = null) {
  const { scraperQueue, error } = getQueueContext();
  if (error || !scraperQueue) {
    throw new ApiError(503, error?.message || 'Queue subsystem is not configured');
  }

  const job = await scraperQueue.add(
    'image-mirroring',
    {
      requestedBy: requestedBy || null,
      triggeredAt: new Date().toISOString(),
      trigger: 'manual',
    },
    {
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );

  const state = await job.getState();
  return {
    queued: true,
    job: {
      id: job.id,
      name: job.name,
      state,
    },
  };
}

module.exports = {
  getQueueHealth,
  getQueueDashboard,
  retryFailedJob,
  retryFailedJobs,
  removeFailedJob,
  enqueueEndpointMonitor,
  enqueueMirroring,
};
