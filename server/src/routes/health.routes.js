import { Router } from 'express';
import { APP_VERSION } from '../config/env.js';

export function createHealthRouter({ ai, reputation, env }) {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: APP_VERSION,
      ai: {
        provider: 'Google Gemini',
        configured: ai.configured,
        model: ai.configured ? ai.model : null,
        fallback_model: ai.configured ? (ai.fallbackModel ?? null) : null,
      },
      reputation: { configured: reputation.configured, provider: reputation.configured ? 'Google Safe Browsing' : null },
      limits: { max_upload_mb: env.MAX_UPLOAD_MB, max_text_chars: env.MAX_TEXT_CHARS },
    });
  });
  return router;
}
