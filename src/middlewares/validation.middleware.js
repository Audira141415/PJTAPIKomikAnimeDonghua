/**
 * Input Validation Middleware
 * Centralized validation for all API inputs
 */
const { body, query, param, validationResult } = require('express-validator');

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.param,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

/**
 * Email Validation Rules
 */
const emailValidation = () =>
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email too long (max 255 characters)');

/**
 * Password Validation Rules (min 8 chars, uppercase, lowercase, number, symbol)
 */
const passwordValidation = () =>
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      'Password must contain uppercase, lowercase, number, and special character'
    );

/**
 * Username Validation Rules
 */
const usernameValidation = () =>
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and dashes');

/**
 * Name Validation Rules
 */
const nameValidation = () =>
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');

/**
 * Pagination Query Validation
 */
const paginationValidation = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Search Query Validation
 */
const searchValidation = () =>
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ max: 255 })
    .withMessage('Search query too long (max 255 characters)');

/**
 * ObjectId Validation
 */
const objectIdValidation = (paramName = 'id') =>
  param(paramName)
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage(`Invalid ${paramName} format`);

/**
 * Manga Validation Rules
 */
const mangaValidation = () => [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be 1-255 characters'),
  body('slug')
    .trim()
    .isSlug()
    .withMessage('Slug must be a valid slug format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description too long (max 5000 characters)'),
  body('author')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Author name too long (max 100 characters)'),
  body('status')
    .optional()
    .isIn(['ongoing', 'completed', 'hiatus', 'cancelled'])
    .withMessage('Invalid status value'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Rating must be between 0 and 10'),
  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array')
    .custom((genres) => {
      if (!Array.isArray(genres)) return false;
      return genres.every((g) => typeof g === 'string' && g.length < 50);
    })
    .withMessage('Each genre must be a string less than 50 characters'),
];

/**
 * Comment Validation Rules
 */
const commentValidation = () => [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Comment must be 1-5000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
];

/**
 * File Upload Validation
 */
const fileUploadValidation = (fieldName = 'file') => (req, res, next) => {
  const file = req.files?.[fieldName] || req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'File is required',
    });
  }

  // File size limit: 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum size: 10MB`,
    });
  }

  // Allowed MIME types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
    });
  }

  next();
};

/**
 * URL Validation
 */
const urlValidation = (fieldName = 'url') =>
  body(fieldName)
    .trim()
    .isURL()
    .withMessage('Invalid URL format')
    .matches(/^https?:\/\//)
    .withMessage('URL must start with http:// or https://');

/**
 * Batch Validation Rules
 */
const createUserValidation = () => [
  emailValidation(),
  usernameValidation(),
  passwordValidation(),
  nameValidation(),
  handleValidationErrors,
];

const loginValidation = () => [
  emailValidation(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const updateUserValidation = () => [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Invalid name'),
  body('avatar').optional().isURL().withMessage('Invalid avatar URL'),
  handleValidationErrors,
];

const createMangaValidation = () => [
  ...mangaValidation(),
  handleValidationErrors,
];

const updateMangaValidation = () => [
  ...mangaValidation(),
  handleValidationErrors,
];

const createCommentValidation = () => [
  ...commentValidation(),
  body('contentType')
    .notEmpty()
    .isIn(['manga', 'anime', 'chapter', 'episode'])
    .withMessage('Invalid content type'),
  body('contentId')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid content ID'),
  handleValidationErrors,
];

module.exports = {
  // Validators
  emailValidation,
  passwordValidation,
  usernameValidation,
  nameValidation,
  paginationValidation,
  searchValidation,
  objectIdValidation,
  mangaValidation,
  commentValidation,
  fileUploadValidation,
  urlValidation,

  // Batch validators
  createUserValidation,
  loginValidation,
  updateUserValidation,
  createMangaValidation,
  updateMangaValidation,
  createCommentValidation,

  // Helper
  handleValidationErrors,
};
