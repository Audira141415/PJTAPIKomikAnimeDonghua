const { z } = require('zod');

/** Comic history entry — mangaId + chapterId */
const addComicHistory = z.object({
  mangaId:   z.string().min(1, 'Manga ID is required'),
  chapterId: z.string().min(1, 'Chapter ID is required'),
});

/** Animation history entry — seriesId + episodeId + optional watchProgress */
const addAnimationHistory = z.object({
  mangaId:       z.string().min(1, 'Series ID is required'),
  episodeId:     z.string().min(1, 'Episode ID is required'),
  watchProgress: z.number().int().nonnegative().optional().default(0),
});

/**
 * General addHistory — accepts either comic or animation shape.
 * The service uses contentType to decide which sub-schema to apply.
 */
const addHistory = z.discriminatedUnion('contentType', [
  addComicHistory.extend({     contentType: z.literal('comic') }),
  addAnimationHistory.extend({ contentType: z.literal('animation') }),
]);

const queryHistory = z.object({
  page:        z.coerce.number().int().positive().optional().default(1),
  limit:       z.coerce.number().int().positive().max(100).optional().default(20),
  contentType: z.enum(['comic', 'animation']).optional(),
});

module.exports = { addHistory, queryHistory };
