'use strict';

const { z } = require('zod');

const dashboardQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const retryAllBody = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const jobIdParam = z.object({
  jobId: z.string().min(1),
});

module.exports = {
  dashboardQuery,
  retryAllBody,
  jobIdParam,
};
