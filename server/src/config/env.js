import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().trim().optional().default(''),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-flash-latest'),
  // Used only when the primary model reports temporary overload (HTTP 503). Empty = disabled.
  GEMINI_FALLBACK_MODEL: z.string().trim().default('gemini-flash-lite-latest'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(45000),
  MAX_UPLOAD_MB: z.coerce.number().min(0.1).max(20).default(5),
  MAX_TEXT_CHARS: z.coerce.number().int().min(100).max(50000).default(10000),
  RATE_LIMIT_ANALYZE_PER_10MIN: z.coerce.number().int().min(1).default(30),
  GOOGLE_SAFE_BROWSING_API_KEY: z.string().trim().optional().default(''),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

function loadEnv(source = process.env) {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  const env = parsed.data;
  return {
    ...env,
    isProduction: env.NODE_ENV === 'production',
    aiConfigured: env.GEMINI_API_KEY.length > 0,
    safeBrowsingConfigured: env.GOOGLE_SAFE_BROWSING_API_KEY.length > 0,
    clientOrigins: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    maxUploadBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),
  };
}

export const env = loadEnv();
export { loadEnv };
export const APP_VERSION = '1.0.0';
