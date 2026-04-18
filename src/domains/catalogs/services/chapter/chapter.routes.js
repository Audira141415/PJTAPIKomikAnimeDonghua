const { Router } = require('express');
const chapterController = require('./chapter.controller');
const { authenticate, authorize } = require('@auth/auth.middleware');
const { uploadChapterImages } = require('@middlewares/upload.middleware');

const router = Router();

router.post('/', authenticate, authorize('admin'), uploadChapterImages, chapterController.create);
router.get('/:id',        chapterController.getById);
router.get('/:id/images', chapterController.getImages);
router.delete('/:id', authenticate, authorize('admin'), chapterController.remove);

module.exports = router;
