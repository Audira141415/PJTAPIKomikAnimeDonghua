const { Router } = require('express');
const seasonController = require('./season.controller');
const { authenticate, authorize } = require('@auth/auth.middleware');
const { uploadCover } = require('@middlewares/upload.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');

const router = Router();

// GET /api/mangas/:seriesId/seasons         — list seasons for a series
// POST /api/mangas/:seriesId/seasons        — admin: create season
// GET /api/seasons/:id                      — get single season by ID
// PUT /api/seasons/:id                      — admin: update season
// DELETE /api/seasons/:id                   — admin: delete season

// Nested under /mangas/:seriesId
router.get('/series/:seriesId', validateObjectId('seriesId'), seasonController.getBySeries);
router.post('/',                authenticate, authorize('admin'), uploadCover, seasonController.create);
router.get('/:id',              validateObjectId('id'), seasonController.getById);
router.put('/:id',              authenticate, authorize('admin'), validateObjectId('id'), uploadCover, seasonController.update);
router.delete('/:id',           authenticate, authorize('admin'), validateObjectId('id'), seasonController.remove);

module.exports = router;
