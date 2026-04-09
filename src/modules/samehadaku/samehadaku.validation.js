'use strict';

const { z } = require('zod');

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const searchQuery = z.object({
  q:    z.string().min(1),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const ongoingQuery = z.object({
  page:  z.coerce.number().int().min(1).max(500).default(1),
  order: z.enum(['latest', 'popular', 'title', 'update']).default('update'),
});

module.exports = { pageQuery, searchQuery, ongoingQuery };
