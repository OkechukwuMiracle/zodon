import multer from 'multer';
import { AppError, ErrorCodes } from '../utils/AppError.js';
import { ALLOWED_IMAGE_MIMES, sniffImageMime } from '../utils/imageSniff.js';

/**
 * In-memory upload (never written to disk). The declared MIME type is a first
 * filter only; the actual content is verified by magic bytes in `verifyImage`.
 */
export function createUpload({ maxUploadBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1, fields: 5, parts: 6 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
        return cb(new AppError(ErrorCodes.UNSUPPORTED_FILE, 'Unsupported file type. Upload a PNG, JPG/JPEG or WEBP image.', 415));
      }
      cb(null, true);
    },
  }).single('image');
}

export function verifyImage(req, _res, next) {
  if (!req.file) {
    return next(new AppError(ErrorCodes.VALIDATION_ERROR, 'No image was uploaded. Attach a PNG, JPG or WEBP screenshot.', 400));
  }
  if (req.file.size === 0) {
    return next(new AppError(ErrorCodes.VALIDATION_ERROR, 'The uploaded image is empty.', 400));
  }
  const actual = sniffImageMime(req.file.buffer);
  if (!actual) {
    return next(new AppError(ErrorCodes.UNSUPPORTED_FILE, 'The file content is not a valid PNG, JPG or WEBP image.', 415));
  }
  req.file.verifiedMime = actual;
  next();
}
