import { createRequestId } from '../utils/ids.js';
import { logger } from '../utils/logger.js';

/** Assign a request id and log method/path/status/duration only — never bodies. */
export function requestContext(req, res, next) {
  req.id = createRequestId();
  res.setHeader('X-Request-Id', req.id);
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    logger.info('request', {
      request_id: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0].slice(0, 100),
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - start) / 1000000n),
    });
  });
  next();
}
