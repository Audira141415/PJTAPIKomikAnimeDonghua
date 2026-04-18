const { z } = require('zod');

const STATUS    = ['ongoing', 'completed', 'hiatus', 'cancelled'];
const QUALITIES = ['360p', '480p', '720p', '1080p'];

const streamUrlSchema = z.object({
  quality: z.enum(QUALITIES),
  url:     z.string().url('Stream URL must be a valid URL'),
});

const subtitleSchema = z.object({
  lang:  z.string().min(2).max(10),
  label: z.string().optional().default(''),
  url:   z.string().url('Subtitle URL must be a valid URL'),
});

const createEpisode = z.object({
  seriesId:      z.string().min(1, 'Series ID is required'),
  seasonId:      z.string().optional().nullable().default(null),
  episodeNumber: z.number().int().min(0),
  title:         z.string().trim().max(200).optional().default(''),
  description:   z.string().max(3000).optional().default(''),
  duration:      z.number().int().nonnegative().optional().default(0),
  streamUrls:    z.array(streamUrlSchema).optional().default([]),
  subtitles:     z.array(subtitleSchema).optional().default([]),
  isFiller:      z.boolean().optional().default(false),
  releaseDate:   z.coerce.date().nullable().optional().default(null),
  slug:          z.string().trim().nullable().optional().default(null),
  sourceUrl:     z.string().url().nullable().optional().default(null),
});

const updateEpisode = z.object({
  title:         z.string().trim().max(200).optional(),
  description:   z.string().max(3000).optional(),
  duration:      z.number().int().nonnegative().optional(),
  streamUrls:    z.array(streamUrlSchema).optional(),
  subtitles:     z.array(subtitleSchema).optional(),
  isFiller:      z.boolean().optional(),
  releaseDate:   z.coerce.date().nullable().optional(),
  slug:          z.string().trim().nullable().optional(),
  sourceUrl:     z.string().url().nullable().optional(),
});

const queryEpisodes = z.object({
  page:     z.coerce.number().int().positive().optional().default(1),
  limit:    z.coerce.number().int().positive().max(100).optional().default(50),
  seasonId: z.string().optional(),
});

module.exports = { createEpisode, updateEpisode, queryEpisodes };
