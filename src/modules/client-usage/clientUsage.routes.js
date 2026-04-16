'use strict';

const { Router } = require('express');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { userActionLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./clientUsage.controller');

const router = Router();

router.use(authenticate, authorize('admin'));

router.post('/clients', userActionLimiter, controller.createClient);
router.get('/clients', controller.listClients);
router.get('/clients/:clientId', controller.getClientById);
router.patch('/clients/:clientId', userActionLimiter, controller.updateClient);
router.post('/clients/:clientId/rotate-key', userActionLimiter, controller.rotateKey);

router.get('/reports/top-websites', controller.getTopWebsites);
router.get('/reports/daily-domain-usage', controller.getDailyDomainUsage);
router.get('/reports/dashboard', controller.getDashboardSummary);

module.exports = router;
