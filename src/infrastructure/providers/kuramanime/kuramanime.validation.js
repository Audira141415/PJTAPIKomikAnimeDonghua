'use strict';

const { z } = require('zod');

const pageQuery     = z.object({ page: z.coerce.number().int().min(1).default(1), order_by: z.string().optional() });
const scheduleQuery = z.object({ scheduled_day: z.string().optional() });
const quickQuery    = z.object({ page: z.coerce.number().int().min(1).default(1), order_by: z.string().optional() });

module.exports = { pageQuery, scheduleQuery, quickQuery };
