'use strict';

const { Router } = require('express');
const jobsController = require('./jobs.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

const router = Router();

// Queue internals are operational/admin endpoints only.
router.get('/health', authenticate, authorize('admin'), jobsController.health);
router.get('/dashboard', authenticate, authorize('admin'), jobsController.dashboard);
router.post('/retry', authenticate, authorize('admin'), jobsController.retryAll);
router.post('/retry/:jobId', authenticate, authorize('admin'), jobsController.retryById);
router.delete('/failed/:jobId', authenticate, authorize('admin'), jobsController.removeFailed);

module.exports = router;
