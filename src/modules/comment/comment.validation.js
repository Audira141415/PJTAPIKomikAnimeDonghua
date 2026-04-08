'use strict';

const { z } = require('zod');

const createSchema = z.object({
  series:        z.string().min(1),
  chapter:       z.string().optional(),
  episode:       z.string().optional(),
  parentComment: z.string().optional(),
  body:          z.string().min(1).max(2000),
});

const querySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { createSchema, querySchema };
