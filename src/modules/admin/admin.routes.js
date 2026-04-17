'use strict';

const { Router } = require('express');
const adminController = require('./admin.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

/**
 * @route   GET /api/v1/admin/audit
 * @desc    Get data integrity audit statistics
 * @access  Admin
 */
router.get('/audit', adminController.getAuditStats);

/**
 * @route   POST /api/v1/admin/purge/cache
 * @desc    Purge Redis cache (selective or full)
 * @access  Admin
 */
router.post('/purge/cache', adminController.purgeCache);

/**
 * @route   POST /api/v1/admin/purge/sessions
 * @desc    Clear expired refresh tokens
 * @access  Admin
 */
router.post('/purge/sessions', adminController.purgeSessions);

module.exports = router;
