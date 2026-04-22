'use strict';

const { Router } = require('express');
const sourceController = require('./source.controller');
const { authenticate, authorize } = require('@auth/auth.middleware');

const router = Router();

// All routes require admin authentication
router.use(authenticate, authorize('admin'));

router.get('/',         sourceController.getSources);
router.get('/:id',      sourceController.getSourceById);
router.post('/',        sourceController.createSource);
router.put('/:id',      sourceController.updateSource);
router.patch('/:id/toggle', sourceController.toggleSource);
router.delete('/:id',   sourceController.deleteSource);

module.exports = router;
