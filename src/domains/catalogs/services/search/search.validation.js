'use strict';

const { z } = require('zod');

const searchQuery = z.object({
  q:         z.string().min(1, 'Search query is required').max(200),
  type:      z.enum(['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona', 'ova']).optional(),
  category:  z.enum(['manga', 'comic', 'anime', 'donghua', 'animation']).optional(),
  genre:     z.string().optional(),
  status:    z.enum(['ongoing', 'completed', 'hiatus', 'cancelled', 'upcoming']).optional(),
  year_from: z.coerce.number().int().min(1900).optional(),
  year_to:   z.coerce.number().int().max(2100).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(18),
});

module.exports = { searchQuery };
