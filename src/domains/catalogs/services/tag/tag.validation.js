const { z } = require('zod');

const createTag = z.object({
  name: z.string().trim().min(1).max(50),
});

const updateTag = z.object({
  name: z.string().trim().min(1).max(50),
});

const listTags = z.object({
  prefix: z.string().trim().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = { createTag, updateTag, listTags };
