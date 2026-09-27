import { rateLimit } from 'express-rate-limit';
import { ErrorCodes } from '../utils/AppError.js';

function handler(req, res, _next, options) {
  res.status(options.statusCode).json({
    error: {
      code: ErrorCodes.RATE_LIMITED,
      message: 'Too many requests. Please wait a few minutes and try again.',
      request_id: req.id,
    },
  });
}

export function createAnalyzeLimiter({ limit }) {
  return rateLimit({ windowMs: 10 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, handler });
}

export function createGlobalLimiter() {
  return rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, handler });
}
