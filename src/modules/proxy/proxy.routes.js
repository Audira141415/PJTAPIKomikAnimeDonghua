'use strict';

const { Router } = require('express');
const { proxyImage } = require('./proxy.controller');

const router = Router();

/**
 * GET /api/v1/image/proxy?url=...
 * Proxy an image URL through this server
 */
router.get('/proxy', proxyImage);

module.exports = router;
