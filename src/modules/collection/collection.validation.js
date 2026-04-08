const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), 'Invalid ObjectId format');

const createCollection = z.object({
  name: z.string().trim().min(1, 'Collection name is required').max(80),
  description: z.string().trim().max(500).optional().default(''),
  visibility: z.enum(['private', 'public']).optional().default('private'),
});

const updateCollection = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).optional(),
    visibility: z.enum(['private', 'public']).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided',
  });

const addItem = z.object({
  mangaId: objectId,
});

const listCollections = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  visibility: z.enum(['private', 'public']).optional(),
});

const listPublicCollections = z.object({
  page: z.coerce.number().int().positive().max(500).optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  visibility: z.literal('public').optional().default('public'),
});

const publicTrending = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

module.exports = {
  createCollection,
  updateCollection,
  addItem,
  listCollections,
  listPublicCollections,
  publicTrending,
};
