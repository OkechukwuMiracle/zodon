import { env, APP_VERSION } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

const app = createApp({ env });

const server = app.listen(env.PORT, () => {
  logger.info('Zodon API listening', {
    port: env.PORT,
    version: APP_VERSION,
    env: env.NODE_ENV,
    ai_configured: env.aiConfigured,
    model: env.GEMINI_MODEL,
    reputation_configured: env.safeBrowsingConfigured,
  });
  if (!env.aiConfigured) {
    logger.warn('GEMINI_API_KEY is not set — live AI analysis is disabled. Synthetic samples and rule-only checks remain available.');
  }
});

// Slightly above the AI timeout so upstream timeouts are reported cleanly.
server.requestTimeout = env.AI_TIMEOUT_MS * 2 + 10000;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
