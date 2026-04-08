const mongoose = require('mongoose');
const ApiError = require('../shared/errors/ApiError');

/**
 * Express middleware factory that validates one or more route params
 * are valid MongoDB ObjectIds before the request reaches the controller.
 *
 * Usage:
 *   router.get('/:id', validateObjectId('id'), controller.getById);
 *   router.get('/:seriesId/episodes/:episodeId', validateObjectId('seriesId', 'episodeId'), ...);
 */
const validateObjectId = (...paramNames) => (req, _res, next) => {
  for (const param of paramNames) {
    const value = req.params[param];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return next(new ApiError(400, `Invalid ID format for parameter: ${param}`));
    }
  }
  next();
};

module.exports = { validateObjectId };
