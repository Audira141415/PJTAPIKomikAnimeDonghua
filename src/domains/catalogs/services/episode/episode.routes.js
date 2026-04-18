const { Router } = require('express');
const episodeController = require('./episode.controller');
const { authenticate, authorize } = require('@auth/auth.middleware');
const { uploadCover } = require('@middlewares/upload.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');

const router = Router();

// GET /api/episodes/series/:seriesId        — list episodes for a series (with optional ?seasonId=)
// POST /api/episodes                        — admin: create episode
// GET /api/episodes/:id                     — get episode by ID (auto-increments views)
// PUT /api/episodes/:id                     — admin: update episode metadata / stream URLs
// DELETE /api/episodes/:id                  — admin: delete episode

router.get('/series/:seriesId', validateObjectId('seriesId'), episodeController.getBySeries);
router.post('/',                authenticate, authorize('admin'), uploadCover, episodeController.create);
router.get('/:id',              validateObjectId('id'), episodeController.getById);
router.put('/:id',              authenticate, authorize('admin'), validateObjectId('id'), uploadCover, episodeController.update);
router.delete('/:id',           authenticate, authorize('admin'), validateObjectId('id'), episodeController.remove);

module.exports = router;
