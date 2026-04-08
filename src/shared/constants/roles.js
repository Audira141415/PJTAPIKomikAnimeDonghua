/**
 * Centralized role constants to avoid scattered string literals.
 * Usage: const { ROLES } = require('../shared/constants/roles');
 */
const ROLES = Object.freeze({
  USER:  'user',
  ADMIN: 'admin',
});

module.exports = { ROLES };
