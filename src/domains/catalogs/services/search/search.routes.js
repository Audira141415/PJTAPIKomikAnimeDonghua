'use strict';

const { Router } = require('express');
const { search } = require('./search.controller');

const router = Router();

router.get('/', search);

module.exports = router;
