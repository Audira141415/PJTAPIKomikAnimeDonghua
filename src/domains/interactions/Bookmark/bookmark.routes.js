const { Router } = require('express');
const bookmarkController = require('./bookmark.controller');
const { authenticate } = require('@auth/auth.middleware');

const router = Router();

router.post('/:mangaId', authenticate, bookmarkController.toggle);
router.get('/',          authenticate, bookmarkController.getAll);

module.exports = router;
