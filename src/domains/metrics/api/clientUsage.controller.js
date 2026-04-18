'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const clientUsageService = require('./clientUsage.service');
const {
  createClientBody,
  updateClientBody,
  clientIdParam,
  listClientsQuery,
  topWebsitesQuery,
  dailyUsageQuery,
  dashboardQuery,
} = require('./clientUsage.validation');

const createClient = catchAsync(async (req, res) => {
  const payload = createClientBody.parse(req.body || {});
  const createdBy = req.user?.id ? String(req.user.id) : null;
  const data = await clientUsageService.createClientApp({ ...payload, createdBy });

  return success(res, {
    statusCode: 201,
    message: 'Client app created',
    data,
  });
});

const listClients = catchAsync(async (req, res) => {
  const query = listClientsQuery.parse(req.query);
  const data = await clientUsageService.listClientApps(query);
  return success(res, {
    message: 'Client apps fetched',
    data: data.items,
    meta: data.meta,
  });
});

const getClientById = catchAsync(async (req, res) => {
  const { clientId } = clientIdParam.parse(req.params);
  const data = await clientUsageService.getClientAppById(clientId);
  return success(res, {
    message: 'Client app fetched',
    data,
  });
});

const updateClient = catchAsync(async (req, res) => {
  const { clientId } = clientIdParam.parse(req.params);
  const payload = updateClientBody.parse(req.body || {});
  const data = await clientUsageService.updateClientApp(clientId, payload);
  return success(res, {
    message: 'Client app updated',
    data,
  });
});

const rotateKey = catchAsync(async (req, res) => {
  const { clientId } = clientIdParam.parse(req.params);
  const data = await clientUsageService.rotateApiKey(clientId);
  return success(res, {
    message: 'API key rotated',
    data,
  });
});

const getTopWebsites = catchAsync(async (req, res) => {
  const query = topWebsitesQuery.parse(req.query);
  const data = await clientUsageService.getTopWebsites(query);
  return success(res, {
    message: 'Top websites fetched',
    data,
  });
});

const getDailyDomainUsage = catchAsync(async (req, res) => {
  const query = dailyUsageQuery.parse(req.query);
  const data = await clientUsageService.getDailyDomainUsage(query);
  return success(res, {
    message: 'Daily usage per domain fetched',
    data,
  });
});

const getDashboardSummary = catchAsync(async (req, res) => {
  const query = dashboardQuery.parse(req.query);
  const data = await clientUsageService.getDashboardSummary(query);
  return success(res, {
    message: 'Client usage dashboard summary fetched',
    data,
  });
});

module.exports = {
  createClient,
  listClients,
  getClientById,
  updateClient,
  rotateKey,
  getTopWebsites,
  getDailyDomainUsage,
  getDashboardSummary,
};
