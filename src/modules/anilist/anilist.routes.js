'use strict';

const { Router } = require('express');
const { getCategoriesConfig, getAnimeFast } = require('./anilist.controller');

const router = Router();

// Legacy compatibility routes
router.get('/categories-config', getCategoriesConfig);
router.get('/anime/:id/fast', getAnimeFast);
router.get('/anime/:id', getAnimeFast); // Alias for full detail

module.exports = router;
