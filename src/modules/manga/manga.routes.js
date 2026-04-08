const { Router } = require('express');
const mangaController = require('./manga.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { uploadCover } = require('../../middlewares/upload.middleware');
const { validateObjectId } = require('../../middlewares/validateObjectId.middleware');
const { userActionLimiter } = require('../../middlewares/rateLimiter.middleware');

const router = Router();

router.get('/',      mangaController.getAll);
router.get('/:slug', mangaController.getBySlug);

router.post('/',     authenticate, authorize('admin'), uploadCover, mangaController.create);
router.put('/:id',   authenticate, authorize('admin'), validateObjectId('id'), uploadCover, mangaController.update);
router.delete('/:id',authenticate, authorize('admin'), validateObjectId('id'), mangaController.remove);

// Authenticated users can submit a rating (1–10), rate-limited per user
router.patch('/:id/rate', authenticate, userActionLimiter, validateObjectId('id'), mangaController.rate);

// Public recommendations
router.get('/:id/recommendations', validateObjectId('id'), mangaController.recommendations);

module.exports = router;
