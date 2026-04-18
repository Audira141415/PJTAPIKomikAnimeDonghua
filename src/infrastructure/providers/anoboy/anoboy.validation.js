'use strict';

const { z } = require('zod');

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const azListQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  show: z.string().length(1).toUpperCase().optional(),
});

const listQuery = z.object({
  page:   z.coerce.number().int().min(1).max(500).default(1),
  status: z.enum(['ongoing', 'completed']).optional(),
  type:   z.string().optional(),
  order:  z.enum(['update', 'title', 'latest']).default('update'),
});

module.exports = { pageQuery, azListQuery, listQuery };
