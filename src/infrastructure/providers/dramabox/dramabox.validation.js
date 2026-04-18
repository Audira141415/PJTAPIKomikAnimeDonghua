'use strict';

const { z } = require('zod');

const pageQuery   = z.object({ page: z.coerce.number().int().min(1).default(1) });
const searchQuery = z.object({ q: z.string().min(1), page: z.coerce.number().int().min(1).default(1) });
const detailQuery = z.object({ bookId: z.string().min(1) });
const streamQuery = z.object({ bookId: z.string().min(1), episode: z.coerce.number().int().min(1) });

module.exports = { pageQuery, searchQuery, detailQuery, streamQuery };
