'use strict';

const { z } = require('zod');

const pageQuery   = z.object({ page: z.coerce.number().int().min(1).default(1) });
const episodeQuery= z.object({ index: z.coerce.number().int().min(1).optional() });

module.exports = { pageQuery, episodeQuery };
