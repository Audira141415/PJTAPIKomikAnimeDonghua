'use strict';

const { z } = require('zod');

const createSchema = z.object({
  series: z.string().min(1),
  body:   z.string().min(10, 'Review must be at least 10 characters').max(5000),
  score:  z.number().int().min(1).max(10),
});

const updateSchema = z.object({
  body:  z.string().min(10).max(5000).optional(),
  score: z.number().int().min(1).max(10).optional(),
}).refine((d) => d.body || d.score !== undefined, { message: 'Provide body or score' });

const querySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = { createSchema, updateSchema, querySchema };
