'use strict';

const { z } = require('zod');
const { SOURCE_ENDPOINTS } = require('./animeImport.service');

const boolFromInput = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }

  const text = String(value).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(text);
}, z.boolean());

const dashboardQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const animeSyncQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  update: boolFromInput.optional().default(true),
  dryRun: boolFromInput.optional().default(false),
});

const animeSyncSourceParam = z.object({
  source: z.enum(SOURCE_ENDPOINTS.map((source) => source.key)),
});

const retryAllBody = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const jobIdParam = z.object({
  jobId: z.string().min(1),
});

module.exports = {
  dashboardQuery,
  animeSyncQuery,
  animeSyncSourceParam,
  retryAllBody,
  jobIdParam,
};
