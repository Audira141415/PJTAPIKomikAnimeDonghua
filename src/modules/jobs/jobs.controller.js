'use strict';

const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const jobsService = require('./jobs.service');
const {
  dashboardQuery,
  retryAllBody,
  jobIdParam,
} = require('./jobs.validation');

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

module.exports = {
  health,
  dashboard,
  retryById,
  retryAll,
  removeFailed,
};
