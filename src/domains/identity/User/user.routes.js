const { Router } = require('express');
const userController = require('./user.controller');
const { authenticate } = require('@auth/auth.middleware');
const { uploadCover }  = require('@middlewares/upload.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');

const router = Router();

router.get('/:userId/profile', validateObjectId('userId'), userController.getPublicProfile);
router.get('/:userId/stats', validateObjectId('userId'), userController.getPublicStats);
router.get('/:userId/reviews', validateObjectId('userId'), userController.getPublicReviews);
router.get('/:userId/comments', validateObjectId('userId'), userController.getPublicComments);
router.get('/me',         authenticate, userController.getMe);
router.patch('/me',       authenticate, userController.updateMe);
router.patch('/me/avatar', authenticate, uploadCover, userController.updateAvatar);

module.exports = router;
