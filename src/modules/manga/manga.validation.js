const { z } = require('zod');

const SERIES_TYPES   = ['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona'];
const SERIES_STATUS  = ['ongoing', 'completed', 'hiatus', 'cancelled', 'upcoming'];
const SORT_FIELDS    = ['title', 'views', 'rating', 'createdAt'];

const createManga = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .trim(),
  description:  z.string().max(5000).optional().default(''),
  type:         z.enum(SERIES_TYPES),
  genres:       z.array(z.string().trim()).optional().default([]),
  author:       z.string().trim().optional().default('Unknown'),
  artist:       z.string().trim().optional().default('Unknown'),
  studio:       z.string().trim().nullable().optional().default(null),
  sub:          z.string().trim().optional().default('Sub'),
  creator:      z.string().trim().nullable().optional().default(null),
  released:     z.string().trim().nullable().optional().default(null),
  duration:     z.string().trim().nullable().optional().default(null),
  network:      z.string().trim().nullable().optional().default(null),
  country:      z.string().trim().nullable().optional().default(null),
  alterTitle:   z.string().trim().max(300).nullable().optional().default(null),
  releasedOn:   z.coerce.date().nullable().optional().default(null),
  status:       z.enum(SERIES_STATUS).optional().default('ongoing'),
  totalEpisodes: z.number().int().min(0).nullable().optional().default(null),
  sourceUrl:    z.string().url().nullable().optional().default(null),
});

const updateManga = z.object({
  title:       z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  type:        z.enum(SERIES_TYPES).optional(),
  genres:      z.array(z.string().trim()).optional(),
  author:      z.string().trim().optional(),
  artist:      z.string().trim().optional(),
  studio:      z.string().trim().nullable().optional(),
  sub:         z.string().trim().optional(),
  creator:     z.string().trim().nullable().optional(),
  released:    z.string().trim().nullable().optional(),
  duration:    z.string().trim().nullable().optional(),
  network:     z.string().trim().nullable().optional(),
  country:     z.string().trim().nullable().optional(),
  alterTitle:  z.string().trim().max(300).nullable().optional(),
  releasedOn:  z.coerce.date().nullable().optional(),
  status:      z.enum(SERIES_STATUS).optional(),
  totalEpisodes: z.number().int().min(0).nullable().optional(),
  sourceUrl:   z.string().url().nullable().optional(),
});

const queryManga = z.object({
  page:            z.coerce.number().int().positive().optional().default(1),
  limit:           z.coerce.number().int().positive().max(100).optional().default(20),
  search:          z.string().trim().optional(),
  genre:           z.string().trim().optional(),
  type:            z.enum(SERIES_TYPES).optional(),
  contentCategory: z.enum(['comic', 'animation']).optional(),
  status:          z.enum(SERIES_STATUS).optional(),
  sortBy:          z.enum(SORT_FIELDS).optional().default('createdAt'),
  order:           z.enum(['asc', 'desc']).optional().default('desc'),
});

const rateManga = z.object({
  score: z.number().int().min(1).max(10),
});

module.exports = { createManga, updateManga, queryManga, rateManga };
