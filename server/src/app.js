import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env as defaultEnv } from './config/env.js';
import { createGeminiService } from './services/ai/gemini.service.js';
import { createReputationService } from './services/security/reputation.js';
import { createAnalyzeController } from './controllers/analyze.controller.js';
import { createAnalyzeRouter } from './routes/analyze.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import { requestContext } from './middleware/requestContext.js';
import { createAnalyzeLimiter, createGlobalLimiter } from './middleware/rateLimiter.js';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Build the Express app. Dependencies are injectable so tests can supply a fake AI
 * client without network access.
 */
export function createApp({ env = defaultEnv, ai, reputation } = {}) {
  const aiService = ai ?? createGeminiService({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      fallbackModel: env.GEMINI_FALLBACK_MODEL || null,
      timeoutMs: env.AI_TIMEOUT_MS,
    });
  const reputationService = reputation ?? createReputationService({ apiKey: env.GOOGLE_SAFE_BROWSING_API_KEY });

  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow non-browser clients (no Origin) and configured origins only.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      methods: ['GET', 'POST'],
      maxAge: 600,
    }),
  );
  app.use(createGlobalLimiter());
  app.use(express.json({ limit: '100kb' }));

  const controller = createAnalyzeController({ ai: aiService, reputation: reputationService, env });
  const analyzeLimiter = createAnalyzeLimiter({ limit: env.RATE_LIMIT_ANALYZE_PER_10MIN });

  app.use('/api', createHealthRouter({ ai: aiService, reputation: reputationService, env }));
  app.use('/api', createAnalyzeRouter({ controller, analyzeLimiter, env }));
  app.get('/', (_req, res) => res.json({ name: 'Zodon API', docs: '/api/health' }));

  app.use(notFoundHandler);
  app.use(createErrorHandler({ maxUploadMb: env.MAX_UPLOAD_MB, isProduction: env.isProduction }));
  return app;
}
