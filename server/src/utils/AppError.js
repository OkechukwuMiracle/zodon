/**
 * Operational error with a stable machine-readable code and a user-safe message.
 * `details` must never contain secrets or raw user content.
 */
export class AppError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.expose = true;
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_URL: 'INVALID_URL',
  UNSUPPORTED_FILE: 'UNSUPPORTED_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_AUTH_FAILED: 'AI_AUTH_FAILED',
  AI_MODEL_UNAVAILABLE: 'AI_MODEL_UNAVAILABLE',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_INVALID_OUTPUT: 'AI_INVALID_OUTPUT',
  AI_UPSTREAM_ERROR: 'AI_UPSTREAM_ERROR',
  AI_BLOCKED: 'AI_BLOCKED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
