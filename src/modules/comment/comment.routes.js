'use strict';

const { Router } = require('express');
const commentController  = require('./comment.controller');
const { authenticate }   = require('../auth/auth.middleware');
const { validateObjectId } = require('../../middlewares/validateObjectId.middleware');

const router = Router();

router.post('/',                       authenticate, commentController.post);
router.get('/series/:seriesId',        validateObjectId('seriesId'), commentController.getBySeries);
router.get('/:id/replies',             validateObjectId('id'), commentController.getReplies);
router.delete('/:id',    authenticate, validateObjectId('id'), commentController.remove);
router.post('/:id/like', authenticate, validateObjectId('id'), commentController.like);

module.exports = router;
