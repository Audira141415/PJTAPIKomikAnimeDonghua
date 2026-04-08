const { User } = require('../models');

const findById = (id) => User.findById(id).lean();

const findPublicById = (id) =>
  User.findById(id)
    .select('username displayName avatar bio createdAt')
    .lean();

const updateById = (id, data) =>
  User.findByIdAndUpdate(id, data, { new: true, runValidators: true });

module.exports = { findById, findPublicById, updateById };
