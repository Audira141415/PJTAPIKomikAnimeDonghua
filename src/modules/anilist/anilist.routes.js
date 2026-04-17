'use strict';

const { Router } = require('express');
const { getCategoriesConfig } = require('./anilist.controller');

const router = Router();

router.get('/categories-config', getCategoriesConfig);

module.exports = router;
