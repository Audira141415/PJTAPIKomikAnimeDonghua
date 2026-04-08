const tagRepo = require('../../repositories/tag.repository');
const ApiError = require('../../utils/ApiError');

/**
 * List tags with optional prefix filter and pagination.
 */
async function listTags(opts) {
  return tagRepo.findAll(opts);
}

/**
 * Get a single tag by slug. Throws 404 if not found.
 */
async function getTag(slug) {
  const tag = await tagRepo.findBySlug(slug);
  if (!tag) throw new ApiError(404, 'Tag not found');
  return tag;
}

/**
 * Create a new tag. Throws 409 if name already exists.
 */
async function createTag(data) {
  const existing = await tagRepo.findBySlug(
    data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  );
  if (existing) throw new ApiError(409, 'Tag already exists');
  return tagRepo.create(data);
}

/**
 * Update a tag by id. Throws 404 if not found.
 */
async function updateTag(id, data) {
  const tag = await tagRepo.updateById(id, data);
  if (!tag) throw new ApiError(404, 'Tag not found');
  return tag;
}

/**
 * Delete a tag by id. Throws 404 if not found.
 */
async function deleteTag(id) {
  const tag = await tagRepo.deleteById(id);
  if (!tag) throw new ApiError(404, 'Tag not found');
}

module.exports = { listTags, getTag, createTag, updateTag, deleteTag };
