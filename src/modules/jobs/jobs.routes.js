'use strict';

const { Router } = require('express');
const jobsController = require('./jobs.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { SOURCE_ENDPOINTS } = require('./animeSync.service');

const router = Router();

// Queue internals are operational/admin endpoints only.
router.get('/health', authenticate, authorize('admin'), jobsController.health);
router.get('/dashboard', authenticate, authorize('admin'), jobsController.dashboard);
router.post('/retry', authenticate, authorize('admin'), jobsController.retryAll);
router.post('/retry/:jobId', authenticate, authorize('admin'), jobsController.retryById);
router.delete('/failed/:jobId', authenticate, authorize('admin'), jobsController.removeFailed);
router.post('/endpoint-monitor', authenticate, authorize('admin'), jobsController.triggerEndpointMonitor);
router.post('/mirror', authenticate, authorize('admin'), jobsController.triggerMirroring);

// Anime DB sync endpoints per source.
router.post('/anime-sync', authenticate, authorize('admin'), jobsController.syncAnimeAll);
router.post('/anime-sync/all', authenticate, authorize('admin'), jobsController.syncAnimeAll);

SOURCE_ENDPOINTS.forEach((source) => {
	router.post(
		`/anime-sync/${source.key}`,
		authenticate,
		authorize('admin'),
		(req, _res, next) => {
			req.params.source = source.key;
			next();
		},
		jobsController.syncAnimeSource,
	);
});

router.post('/anime-sync/:source', authenticate, authorize('admin'), jobsController.syncAnimeSource);

module.exports = router;
