'use strict';

const { z } = require('zod');

const updateProfile = z.object({
  username:    z.string().min(3).max(30).trim().optional(),
  bio:         z.string().max(500).optional(),
  displayName: z.string().max(50).trim().optional(),
});

const publicFeedQuery = z.object({
  page:  z.coerce.number().int().positive().max(500).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort:  z.enum(['latest', 'top']).default('latest'),
});

const publicCommentFeedQuery = z.object({
  page:  z.coerce.number().int().positive().max(500).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort:  z.enum(['latest', 'most_liked']).default('latest'),
});

module.exports = { updateProfile, publicFeedQuery, publicCommentFeedQuery };
