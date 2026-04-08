'use strict';

const { z } = require('zod');

const listBookmarks = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { listBookmarks };
