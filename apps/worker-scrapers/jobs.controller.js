'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const jobsService = require('./jobs.service');
const {
  dashboardQuery,
  animeSyncQuery,
  animeSyncSourceParam,
  retryAllBody,
  jobIdParam,
} = require('./jobs.validation');
const animeSyncService = require('./animeImport.service');

const health = catchAsync(async (_req, res) => {
  const data = await jobsService.getQueueHealth();
  return success(res, {
    message: 'Queue health fetched',
    data,
  });
});

const dashboard = catchAsync(async (req, res) => {
  const { limit } = dashboardQuery.parse(req.query);
  const data = await jobsService.getQueueDashboard(limit);
  return success(res, {
    message: 'Queue dashboard fetched',
    data,
  });
});

const retryById = catchAsync(async (req, res) => {
  const { jobId } = jobIdParam.parse(req.params);
  const data = await jobsService.retryFailedJob(jobId);
  return success(res, {
    message: 'Failed job retried',
    data,
  });
});

const retryAll = catchAsync(async (req, res) => {
  const { limit } = retryAllBody.parse(req.body || {});
  const data = await jobsService.retryFailedJobs(limit);
  return success(res, {
    message: 'Failed jobs retry requested',
    data,
  });
});

const removeFailed = catchAsync(async (req, res) => {
  const { jobId } = jobIdParam.parse(req.params);
  const data = await jobsService.removeFailedJob(jobId);
  return success(res, {
    message: 'Failed job removed',
    data,
  });
});

const syncAnimeSource = catchAsync(async (req, res) => {
  const { source } = animeSyncSourceParam.parse(req.params);
  const options = animeSyncQuery.parse(req.query);
  const data = await animeSyncService.syncAnimeSource(source, options);

  return success(res, {
    message: `Anime source synced: ${source}`,
    data,
  });
});

const syncAnimeAll = catchAsync(async (req, res) => {
  const options = animeSyncQuery.parse(req.query);
  const data = await animeSyncService.syncAnimeSources(undefined, options);

  return success(res, {
    message: 'All anime sources synced',
    data,
  });
});

const triggerEndpointMonitor = catchAsync(async (req, res) => {
  const userId = req.user?._id ? String(req.user._id) : null;
  const data = await jobsService.enqueueEndpointMonitor(userId);

  return success(res, {
    message: 'Endpoint monitor job enqueued',
    data,
  });
});

const triggerMirroring = catchAsync(async (req, res) => {
  const userId = req.user?._id ? String(req.user._id) : null;
  const data = await jobsService.enqueueMirroring(userId);

  return success(res, {
    message: 'Image mirroring job enqueued',
    data,
  });
});

module.exports = {
  health,
  dashboard,
  retryById,
  retryAll,
  removeFailed,
  syncAnimeSource,
  syncAnimeAll,
  triggerEndpointMonitor,
  triggerMirroring,
};
