const { Router } = require('express');
const collectionController = require('./collection.controller');
const { authenticate } = require('@auth/auth.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');

const router = Router();

router.get('/public/trending', collectionController.getPublicTrending);
router.get('/public/:collectionId', validateObjectId('collectionId'), collectionController.getPublicById);

router.post('/', authenticate, collectionController.create);
router.get('/', authenticate, collectionController.getAll);
router.get('/:collectionId', authenticate, validateObjectId('collectionId'), collectionController.getById);
router.patch('/:collectionId', authenticate, validateObjectId('collectionId'), collectionController.update);
router.delete('/:collectionId', authenticate, validateObjectId('collectionId'), collectionController.remove);

router.post(
  '/:collectionId/items',
  authenticate,
  validateObjectId('collectionId'),
  collectionController.addItem
);

router.delete(
  '/:collectionId/items/:mangaId',
  authenticate,
  validateObjectId('collectionId', 'mangaId'),
  collectionController.removeItem
);

module.exports = router;
