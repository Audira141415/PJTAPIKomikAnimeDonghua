'use strict';

const { z } = require('zod');

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const searchQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const listQuery = z.object({
  page:   z.coerce.number().int().min(1).max(500).default(1),
  status: z.string().optional(),
  type:   z.string().optional(),
  order:  z.string().optional(),
});

module.exports = { pageQuery, searchQuery, listQuery };
