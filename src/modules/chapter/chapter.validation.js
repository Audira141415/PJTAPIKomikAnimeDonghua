const { z } = require('zod');

const createChapter = z.object({
  chapterNumber: z.coerce.number().positive('Chapter number must be positive'),
  title:   z.string().max(200).trim().optional().default(''),
  mangaId: z.string().min(1, 'Manga ID is required'),
});

const queryChapters = z.object({
  page:  z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

module.exports = { createChapter, queryChapters };
