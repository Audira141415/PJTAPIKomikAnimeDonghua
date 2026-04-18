const { Router } = require('express');
const tagController = require('./tag.controller');
const { authenticate, authorize } = require('@auth/auth.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');

const router = Router();

// Public
router.get('/',       tagController.list);
router.get('/:slug',  tagController.getBySlug);

// Admin only
router.post('/',      authenticate, authorize('admin'), tagController.create);
router.patch('/:id',  authenticate, authorize('admin'), validateObjectId('id'), tagController.update);
router.delete('/:id', authenticate, authorize('admin'), validateObjectId('id'), tagController.remove);

module.exports = router;
