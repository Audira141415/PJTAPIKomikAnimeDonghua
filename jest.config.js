'use strict';

module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  testTimeout: 15000,
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/modules/auth/auth.service.js',
    'src/modules/manga/manga.service.js',
    'src/modules/episode/episode.service.js',
    'src/modules/season/season.service.js',
    'src/modules/comment/comment.service.js',
    'src/modules/review/review.service.js',
    'src/modules/history/history.service.js',
    'src/modules/tag/tag.service.js',
    'src/modules/user/user.service.js',
    'src/shared/utils/catchAsync.js',
    'src/shared/utils/paginate.js',
    'src/shared/utils/response.js',
    'src/shared/utils/cache.js',
    'src/middlewares/validateObjectId.middleware.js',
    'src/jobs/**/*.js',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 75,
      branches: 60,
    },
  },
};
