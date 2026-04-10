'use strict';

const { z } = require('zod');

const pageQuery   = z.object({ page: z.coerce.number().int().min(1).default(1) });
const searchQuery = z.object({ query: z.string().min(1) });
const listQuery   = z.object({ show: z.string().optional().default('all'), page: z.coerce.number().int().min(1).default(1) });

module.exports = { pageQuery, searchQuery, listQuery };
