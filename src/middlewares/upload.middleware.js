const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('@core/errors/ApiError');
const { env } = require('@core/config/env');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Server-side MIME → extension map (never trust client-supplied extension)
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed'), false);
  }
};

const uniqueFilename = (prefix, mimetype) => {
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = MIME_TO_EXT[mimetype] || '.bin';
  return `${prefix}-${suffix}${ext}`;
};

// ── Storage factory ───────────────────────────────────────────────────────────

/**
 * Returns the appropriate multer storage engine.
 * When all S3_* env vars are present → use @aws-sdk/client-s3 + multer-s3.
 * Otherwise → fall back to local diskStorage.
 *
 * The returned uploadedFileUrl() helper normalises the stored path to a public URL
 * regardless of storage backend.
 */
const buildStorage = (prefix) => {
  const useS3 =
    env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET;

  if (useS3) {
    // Optional peer dependencies — only required in production with S3 configured
    let S3Client, PutObjectCommand, multerS3;
    try {
      ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
      multerS3 = require('multer-s3');
    } catch {
      throw new Error(
        'S3 env vars are set but @aws-sdk/client-s3 and multer-s3 are not installed. ' +
        'Run: npm install @aws-sdk/client-s3 multer-s3'
      );
    }

    const s3Client = new S3Client({
      endpoint:    env.S3_ENDPOINT,
      region:      env.S3_REGION,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
      forcePathStyle: true, // required for MinIO / non-AWS S3
    });

    const storage = multerS3({
      s3: s3Client,
      bucket: env.S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        cb(null, `${prefix}/${uniqueFilename(prefix, file.mimetype)}`);;
      },
    });

    /** Returns the public URL for an S3-stored file */
    const uploadedFileUrl = (file) => {
      const base = env.S3_PUBLIC_URL || `${env.S3_ENDPOINT}/${env.S3_BUCKET}`;
      return `${base}/${file.key}`;
    };

    return { storage, uploadedFileUrl };
  }

  // ── Local disk fallback ───────────────────────────────────────────────────
  const destDir = path.join(env.UPLOAD_DIR, prefix === 'cover' ? 'covers' : prefix);
  fs.mkdirSync(destDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename:    (req, file, cb) => cb(null, uniqueFilename(prefix, file.mimetype)),
  });

  /** Returns the local URL path for a disk-stored file */
  const uploadedFileUrl = (file) =>
    `/uploads/${prefix === 'cover' ? 'covers' : prefix}/${file.filename}`;

  return { storage, uploadedFileUrl };
};

// ── Temp storage (chapter image upload) ──────────────────────────────────────
const tempDir = path.join(env.UPLOAD_DIR, 'temp');
fs.mkdirSync(tempDir, { recursive: true });

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename:    (req, file, cb) => cb(null, uniqueFilename('tmp', file.mimetype)),
});

const uploadChapterImages = multer({
  storage: tempStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 100 },
}).array('images', 100);

// ── Cover upload (series cover + season cover + episode thumbnail) ─────────
const { storage: coverStorage, uploadedFileUrl: coverFileUrl } = buildStorage('cover');

const uploadCover = multer({
  storage: coverStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('coverImage');

// ── Thumbnail upload (episode thumbnail) ─────────────────────────────────────
// Reuses the same cover storage path; separated for semantic clarity in routes
const uploadThumbnail = multer({
  storage: coverStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('thumbnail');

module.exports = { uploadChapterImages, uploadCover, uploadThumbnail, coverFileUrl };
