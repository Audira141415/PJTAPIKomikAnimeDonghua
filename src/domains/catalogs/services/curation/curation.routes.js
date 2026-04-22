'use strict';

const { Router } = require('express');
const { authenticate, authorize } = require('@auth/auth.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');
const curationController = require('./curation.controller');

const router = Router();

// Public: Get currently curated lists
router.get('/', curationController.getCurated);

// Admin Protected: Manage curation
router.post('/:id/feature', authenticate, authorize('admin'), validateObjectId('id'), curationController.toggleFeatured);
router.post('/:id/hot',     authenticate, authorize('admin'), validateObjectId('id'), curationController.toggleHot);
router.patch('/:id/meta',   authenticate, authorize('admin'), validateObjectId('id'), curationController.updateCurationMeta);

module.exports = router;
