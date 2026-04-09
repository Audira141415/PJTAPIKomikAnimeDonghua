'use strict';

const { z } = require('zod');

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

module.exports = { pageQuery };
