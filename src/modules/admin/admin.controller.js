'use strict';

const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const adminService = require('./admin.service');
const { z } = require('zod');

const getAuditStats = catchAsync(async (req, res) => {
  const stats = await adminService.getAuditStats();
  return success(res, {
    message: 'Audit statistics fetched',
    data: stats
  });
});

const purgeCache = catchAsync(async (req, res) => {
  const schema = z.object({
    pattern: z.string().default('*')
  });
  const { pattern } = schema.parse(req.body);
  const result = await adminService.purgeCache(pattern);
  return success(res, result);
});

const purgeSessions = catchAsync(async (req, res) => {
  const result = await adminService.purgeSessions();
  return success(res, result);
});

module.exports = {
  getAuditStats,
  purgeCache,
  purgeSessions,
};
