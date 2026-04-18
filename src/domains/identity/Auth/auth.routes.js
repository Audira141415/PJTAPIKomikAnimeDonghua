const { Router } = require('express');
const authController = require('./auth.controller');
const { authLimiter } = require('@middlewares/rateLimiter.middleware');

const router = Router();

router.post('/register',        authLimiter, authController.register);
router.post('/login',           authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout',  authLimiter, authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password',  authLimiter, authController.resetPassword);
router.get('/verify-email',                  authController.verifyEmail);

module.exports = router;
