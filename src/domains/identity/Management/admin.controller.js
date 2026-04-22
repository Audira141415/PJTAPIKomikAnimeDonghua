'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
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

const getUsers = catchAsync(async (req, res) => {
  const users = await adminService.getUsers(req.query);
  return success(res, {
    message: 'Users list fetched',
    data: users
  });
});

const updateUserRole = catchAsync(async (req, res) => {
  const schema = z.object({
    role: z.enum(['user', 'admin'])
  });
  const { role } = schema.parse(req.body);
  const { userId } = req.params;
  const user = await adminService.updateUserRole(userId, role);
  return success(res, {
    message: 'User role updated',
    data: user
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await adminService.deleteUser(userId);
  return success(res, {
    message: 'User account deleted',
    data: result
  });
});

module.exports = {
  getAuditStats,
  purgeCache,
  purgeSessions,
  getUsers,
  updateUserRole,
  deleteUser,
};
