/**
 * Minimal structured logger. Callers must only pass metadata (ids, codes,
 * durations) — never request bodies, submitted text, images, or keys.
 */
const silent = process.env.NODE_ENV === 'test';

function write(level, message, meta = {}) {
  if (silent) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg: message, ...meta });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
};
