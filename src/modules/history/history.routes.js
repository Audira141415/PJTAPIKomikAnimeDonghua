const { Router } = require('express');
const historyController = require('./history.controller');
const { authenticate } = require('../auth/auth.middleware');

const router = Router();

router.post('/', authenticate, historyController.add);
router.get('/',  authenticate, historyController.getAll);

module.exports = router;
