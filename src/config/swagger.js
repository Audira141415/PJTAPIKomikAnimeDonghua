'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const { env } = require('./env');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Audira Comic API',
    version: '1.0.0',
    description:
      'REST API milik Audira untuk platform komik, manhwa, manhua, anime, dan donghua. Mendukung komik (chapters) dan animasi (seasons + episodes).',
    contact: { name: 'Audira' },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current server (auto-detected)',
    },
    {
      url: `http://localhost:${env.PORT}/api/v1`,
      description: `Production (port ${env.PORT})`,
    },
    {
      url: 'http://localhost:5001/api/v1',
      description: 'Development (port 5001)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // ── Generic ────────────────────────────────────────────────────────────
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          data: { type: 'object', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total:      { type: 'integer', example: 100 },
          page:       { type: 'integer', example: 1 },
          limit:      { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      // ── Auth ───────────────────────────────────────────────────────────────
      RegisterBody: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 30 },
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
      LoginBody: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken:  { type: 'string' },
          refreshToken: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              _id:      { type: 'string' },
              username: { type: 'string' },
              email:    { type: 'string' },
              role:     { type: 'string', enum: ['user', 'admin'] },
            },
          },
        },
      },
      // ── Series (Manga/Anime/etc.) ──────────────────────────────────────────
      Series: {
        type: 'object',
        properties: {
          _id:             { type: 'string' },
          title:           { type: 'string' },
          slug:            { type: 'string' },
          description:     { type: 'string' },
          type:            { type: 'string', enum: ['manga','manhwa','manhua','anime','donghua'] },
          contentCategory: { type: 'string', enum: ['comic','animation'] },
          genres:          { type: 'array', items: { type: 'string' } },
          tags:            { type: 'array', items: { type: 'string' } },
          status:          { type: 'string', enum: ['ongoing','completed','hiatus','cancelled'] },
          coverImage:      { type: 'string', nullable: true },
          rating:          { type: 'number' },
          ratingCount:     { type: 'integer' },
          views:           { type: 'integer' },
        },
      },
      // ── Chapter ────────────────────────────────────────────────────────────
      Chapter: {
        type: 'object',
        properties: {
          _id:           { type: 'string' },
          series:        { type: 'string' },
          chapterNumber: { type: 'number' },
          title:         { type: 'string' },
          images:        { type: 'array', items: { type: 'string' } },
        },
      },
      // ── Season / Episode ───────────────────────────────────────────────────
      Season: {
        type: 'object',
        properties: {
          _id:    { type: 'string' },
          series: { type: 'string' },
          number: { type: 'integer' },
          title:  { type: 'string' },
          status: { type: 'string' },
        },
      },
      Episode: {
        type: 'object',
        properties: {
          _id:           { type: 'string' },
          series:        { type: 'string' },
          season:        { type: 'string', nullable: true },
          episodeNumber: { type: 'number' },
          title:         { type: 'string' },
          duration:      { type: 'integer', description: 'Seconds' },
        },
      },
      // ── Comment ────────────────────────────────────────────────────────────
      Comment: {
        type: 'object',
        properties: {
          _id:           { type: 'string' },
          user:          { type: 'string' },
          series:        { type: 'string' },
          body:          { type: 'string' },
          parentComment: { type: 'string', nullable: true },
          likes:         { type: 'integer' },
          createdAt:     { type: 'string', format: 'date-time' },
        },
      },
      // ── Review ─────────────────────────────────────────────────────────────
      Review: {
        type: 'object',
        properties: {
          _id:       { type: 'string' },
          user:      { type: 'string' },
          series:    { type: 'string' },
          body:      { type: 'string' },
          score:     { type: 'integer', minimum: 1, maximum: 10 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Tag ────────────────────────────────────────────────────────────────
      Tag: {
        type: 'object',
        properties: {
          _id:   { type: 'string' },
          name:  { type: 'string' },
          slug:  { type: 'string' },
          count: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: {
          200: { description: 'API is running' },
        },
      },
    },
    // ── Auth ────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register a new user', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterBody' } } } },
        responses: {
          201: { description: 'Registered successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          409: { description: 'Email or username already taken' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginBody' } } } },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: 'Refresh access token', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: 'New tokens issued' }, 401: { description: 'Invalid refresh token' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'Logout (invalidate refresh token)', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'], summary: 'Request password reset email', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } } } } } },
        responses: { 200: { description: 'Reset email sent if account exists' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'], summary: 'Reset password using token', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token','password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 6 } } } } } },
        responses: { 200: { description: 'Password reset successfully' }, 400: { description: 'Invalid or expired token' } },
      },
    },
    '/auth/verify-email': {
      get: {
        tags: ['Auth'], summary: 'Verify email address', security: [],
        parameters: [{ in: 'query', name: 'token', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Email verified' }, 400: { description: 'Invalid or expired token' } },
      },
    },
    // ── Users ───────────────────────────────────────────────────────────────
    '/users/me': {
      get: {
        tags: ['Users'], summary: 'Get current user profile',
        responses: { 200: { description: 'User profile' }, 401: { description: 'Unauthorized' } },
      },
      patch: {
        tags: ['Users'], summary: 'Update current user profile',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, bio: { type: 'string' } } } } } },
        responses: { 200: { description: 'Profile updated' } },
      },
    },
    '/users/me/avatar': {
      patch: {
        tags: ['Users'], summary: 'Upload avatar',
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } },
        responses: { 200: { description: 'Avatar updated' } },
      },
    },
    // ── Series (mangas) ─────────────────────────────────────────────────────
    '/mangas': {
      get: {
        tags: ['Series'], summary: 'List all series', security: [],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'type', schema: { type: 'string', enum: ['manga','manhwa','manhua','anime','donghua'] } },
          { in: 'query', name: 'contentCategory', schema: { type: 'string', enum: ['comic','animation'] } },
          { in: 'query', name: 'genre', schema: { type: 'string' } },
          { in: 'query', name: 'tag', schema: { type: 'string', description: 'Tag slug' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ongoing','completed','hiatus','cancelled'] } },
          { in: 'query', name: 'sortBy', schema: { type: 'string', enum: ['createdAt','rating','views'] } },
          { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc','desc'] } },
        ],
        responses: { 200: { description: 'Series list' } },
      },
      post: {
        tags: ['Series'], summary: 'Create series (admin)',
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', required: ['title','type'], properties: { title: { type: 'string' }, type: { type: 'string' }, cover: { type: 'string', format: 'binary' } } } } } },
        responses: { 201: { description: 'Series created' }, 401: { description: 'Unauthorized' }, 403: { description: 'Forbidden' } },
      },
    },
    '/mangas/{slug}': {
      get: {
        tags: ['Series'], summary: 'Get series by slug', security: [],
        parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Series detail' }, 404: { description: 'Not found' } },
      },
    },
    '/mangas/{id}/rate': {
      patch: {
        tags: ['Series'], summary: 'Rate a series (1-10)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { score: { type: 'integer', minimum: 1, maximum: 10 } } } } } },
        responses: { 200: { description: 'Rating submitted' } },
      },
    },
    '/mangas/{id}/recommendations': {
      get: {
        tags: ['Series'], summary: 'Get recommendations for a series', security: [],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'List of recommended series' } },
      },
    },
    // ── Search ───────────────────────────────────────────────────────────────
    '/search': {
      get: {
        tags: ['Search'], summary: 'Full-text search across all series', security: [],
        parameters: [
          { in: 'query', name: 'q', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'type', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Search results' }, 400: { description: 'Query required' } },
      },
    },
    // ── Comments ─────────────────────────────────────────────────────────────
    '/comments': {
      post: {
        tags: ['Comments'], summary: 'Post a comment on a series/chapter/episode',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['series','body'], properties: { series: { type: 'string' }, chapter: { type: 'string' }, episode: { type: 'string' }, body: { type: 'string', minLength: 1, maxLength: 2000 }, parentComment: { type: 'string' } } } } } },
        responses: { 201: { description: 'Comment created' } },
      },
    },
    '/comments/series/{seriesId}': {
      get: {
        tags: ['Comments'], summary: 'Get comments for a series', security: [],
        parameters: [
          { in: 'path', name: 'seriesId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Comments list' } },
      },
    },
    '/comments/{id}': {
      delete: {
        tags: ['Comments'], summary: 'Delete own comment',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 403: { description: 'Not your comment' } },
      },
    },
    '/comments/{id}/like': {
      post: {
        tags: ['Comments'], summary: 'Like / unlike a comment',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Like toggled' } },
      },
    },
    // ── Reviews ──────────────────────────────────────────────────────────────
    '/reviews': {
      post: {
        tags: ['Reviews'], summary: 'Submit a review for a series',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['series','body','score'], properties: { series: { type: 'string' }, body: { type: 'string' }, score: { type: 'integer', minimum: 1, maximum: 10 } } } } } },
        responses: { 201: { description: 'Review created' }, 409: { description: 'Already reviewed' } },
      },
    },
    '/reviews/series/{seriesId}': {
      get: {
        tags: ['Reviews'], summary: 'Get reviews for a series', security: [],
        parameters: [{ in: 'path', name: 'seriesId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Reviews list' } },
      },
    },
    '/reviews/{id}': {
      patch: {
        tags: ['Reviews'], summary: 'Update own review',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { body: { type: 'string' }, score: { type: 'integer', minimum: 1, maximum: 10 } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Reviews'], summary: 'Delete own review',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    // ── Tags ─────────────────────────────────────────────────────────────────
    '/tags': {
      get: {
        tags: ['Tags'], summary: 'List all tags', security: [],
        parameters: [{ in: 'query', name: 'search', schema: { type: 'string' } }],
        responses: { 200: { description: 'Tags list' } },
      },
      post: {
        tags: ['Tags'], summary: 'Create tag (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
        responses: { 201: { description: 'Tag created' } },
      },
    },
    '/tags/{id}': {
      delete: {
        tags: ['Tags'], summary: 'Delete tag (admin)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({ definition, apis: [] });

module.exports = { swaggerSpec };
