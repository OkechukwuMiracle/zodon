import multer from 'multer';
import { AppError, ErrorCodes } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(ErrorCodes.NOT_FOUND, `Route not found: ${req.method} ${req.path}`, 404));
}

/**
 * Centralised error handler. Produces `{ error: { code, message, request_id, details? } }`.
 * Never includes stack traces or raw request content in responses or logs.
 */
export function createErrorHandler({ maxUploadMb, isProduction }) {
  // Express identifies error handlers by their 4-argument signature.
  return function errorHandler(err, req, res, _next) {
    let appErr = err;

    if (err instanceof multer.MulterError) {
      appErr =
        err.code === 'LIMIT_FILE_SIZE'
          ? new AppError(ErrorCodes.FILE_TOO_LARGE, `The image is larger than the ${maxUploadMb} MB limit.`, 413)
          : new AppError(ErrorCodes.VALIDATION_ERROR, 'Upload a single image in the "image" field.', 400);
    } else if (err?.type === 'entity.too.large') {
      appErr = new AppError(ErrorCodes.VALIDATION_ERROR, 'The request body is too large.', 413);
    } else if (err?.type === 'entity.parse.failed') {
      appErr = new AppError(ErrorCodes.VALIDATION_ERROR, 'The request body is not valid JSON.', 400);
    } else if (!(err instanceof AppError)) {
      logger.error('unhandled error', { request_id: req.id, name: err?.name, message: isProduction ? undefined : err?.message });
      appErr = new AppError(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred. Please try again.', 500);
    }

    if (appErr.status >= 500) logger.warn('request failed', { request_id: req.id, code: appErr.code, status: appErr.status });

    res.status(appErr.status).json({
      error: {
        code: appErr.code,
        message: appErr.message,
        request_id: req.id,
        ...(appErr.details ? { details: appErr.details } : {}),
      },
    });
  };
}
