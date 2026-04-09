'use strict';

const { z } = require('zod');

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const animeListQuery = z.object({
  letter: z.string().length(1).toUpperCase().optional(),
  page:   z.coerce.number().int().min(1).max(500).default(1),
});

const advancedQuery = z.object({
  genres: z.string().optional(),
  status: z.enum(['ongoing', 'completed']).optional(),
  page:   z.coerce.number().int().min(1).max(500).default(1),
});

module.exports = { pageQuery, animeListQuery, advancedQuery };
