'use strict';

const { Router } = require('express');
const seoController = require('./seo.controller');

const router = Router();

/**
 * @route   GET /api/v1/seo/sitemap.xml
 * @desc    Generate dynamic XML sitemap
 * @access  Public
 */
router.get('/sitemap.xml', seoController.generateSitemap);

module.exports = router;
