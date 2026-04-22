'use strict';

const { z } = require('zod');

const sourceBody = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Key must be lowercase alphanumeric or hyphen'),
  name: z.string().min(2).max(100),
  category: z.enum(['comic', 'anime', 'donghua', 'mixed', 'other']).default('mixed'),
  baseUrl: z.string().url(),
  endpoint: z.string().min(1).startsWith('/').optional().nullable(),
  enabled: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).default(100),
  defaultType: z.enum(['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona']).default('anime'),
  syncStrategy: z.enum(['collection', 'detail', 'hybrid']).default('hybrid'),
  notes: z.string().max(2000).optional().default(''),
});

const sourceIdParam = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Source ID'),
});

const sourceQuery = z.object({
  category: z.string().optional(),
  enabled: z.preprocess((val) => val === 'true', z.boolean()).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  sourceBody,
  sourceIdParam,
  sourceQuery,
};
