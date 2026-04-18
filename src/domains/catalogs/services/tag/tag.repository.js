const {             Tag             } = require('@models');
const {             Manga             } = require('@models');

/**
 * Find all tags sorted by name, with optional name prefix filter.
 * @param {object} opts
 * @param {string} [opts.prefix]  – case-insensitive name prefix search
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=50]
 */
async function findAll({ prefix, page = 1, limit = 50 } = {}) {
  const filter = prefix
    ? { name: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } }
    : {};
  const skip = (page - 1) * limit;
  const [results, total] = await Promise.all([
    Tag.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Tag.countDocuments(filter),
  ]);
  return { results, total, page, limit };
}

/**
 * Find a single tag by slug.
 * @param {string} slug
 */
async function findBySlug(slug) {
  return Tag.findOne({ slug }).lean();
}

/**
 * Find a single tag by id.
 * @param {string} id
 */
async function findById(id) {
  return Tag.findById(id).lean();
}

/**
 * Create a new tag.
 * @param {{ name: string }} data
 */
async function create(data) {
  const tag = new Tag(data);
  return tag.save();
}

/**
 * Update a tag by id.
 * @param {string} id
 * @param {{ name?: string }} data
 */
async function updateById(id, data) {
  return Tag.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
}

/**
 * Delete a tag by id and remove it from all manga that reference it.
 * @param {string} id
 */
async function deleteById(id) {
  const [deleted] = await Promise.all([
    Tag.findByIdAndDelete(id),
    Manga.updateMany({ tags: id }, { $pull: { tags: id } }),
  ]);
  return deleted;
}

/**
 * Increment/decrement the denormalised count field for one or more tag ids.
 * @param {string[]} tagIds
 * @param {1|-1}     delta
 */
async function adjustCount(tagIds, delta) {
  if (!tagIds || tagIds.length === 0) return;
  return Tag.updateMany({ _id: { $in: tagIds } }, { $inc: { count: delta } });
}

module.exports = { findAll, findBySlug, findById, create, updateById, deleteById, adjustCount };
