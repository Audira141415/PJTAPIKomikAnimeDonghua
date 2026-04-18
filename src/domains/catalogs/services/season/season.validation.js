const { z } = require('zod');

const STATUS = ['ongoing', 'completed', 'hiatus', 'cancelled'];

const createSeason = z.object({
  seriesId:    z.string().min(1, 'Series ID is required'),
  number:      z.number().int().positive(),
  title:       z.string().trim().max(200).optional().default(''),
  description: z.string().max(3000).optional().default(''),
  year:        z.number().int().min(1900).max(2100).nullable().optional().default(null),
  status:      z.enum(STATUS).optional().default('ongoing'),
});

const updateSeason = z.object({
  title:       z.string().trim().max(200).optional(),
  description: z.string().max(3000).optional(),
  year:        z.number().int().min(1900).max(2100).nullable().optional(),
  status:      z.enum(STATUS).optional(),
  coverImage:  z.string().optional(),
});

const querySeasons = z.object({
  page:  z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = { createSeason, updateSeason, querySeasons };
