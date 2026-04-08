'use strict';

const { Router } = require('express');
const reviewController   = require('./review.controller');
const { authenticate }   = require('../auth/auth.middleware');
const { validateObjectId } = require('../../middlewares/validateObjectId.middleware');

const router = Router();

router.post('/',                    authenticate, reviewController.create);
router.get('/series/:seriesId',     validateObjectId('seriesId'), reviewController.getBySeries);
router.patch('/:id',  authenticate, validateObjectId('id'), reviewController.update);
router.delete('/:id', authenticate, validateObjectId('id'), reviewController.remove);

module.exports = router;
