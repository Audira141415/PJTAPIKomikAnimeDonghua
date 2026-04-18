'use strict';

const { z } = require('zod');

const boolFromInput = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(text);
}, z.boolean());

const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const createClientBody = z.object({
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().toLowerCase().regex(domainPattern, 'Invalid domain format'),
});

const updateClientBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  domain: z.string().trim().toLowerCase().regex(domainPattern, 'Invalid domain format').optional(),
  status: z.enum(['active', 'suspended', 'revoked']).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

const clientIdParam = z.object({
  clientId: z.string().regex(objectIdPattern, 'Invalid client id'),
});

const listClientsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended', 'revoked']).optional(),
});

const topWebsitesQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const dailyUsageQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  domain: z.string().trim().toLowerCase().regex(domainPattern, 'Invalid domain format').optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

const dashboardQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  includeUnknown: boolFromInput.optional().default(true),
});

module.exports = {
  createClientBody,
  updateClientBody,
  clientIdParam,
  listClientsQuery,
  topWebsitesQuery,
  dailyUsageQuery,
  dashboardQuery,
};
