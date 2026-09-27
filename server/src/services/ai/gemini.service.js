import { GoogleGenAI } from '@google/genai';
import { AiOutputSchema, buildResponseJsonSchema } from '../../schemas/aiOutput.schema.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.service.js';
import { AppError, ErrorCodes } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

/** Parse model text as JSON, tolerating a surrounding ```json fence. */
export function parseModelJson(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('empty response');
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1];
  return JSON.parse(s);
}

/** Validate a parsed object against the AI schema. Returns {ok, data} or {ok:false, issues}. */
export function validateAiOutput(obj, { requireImage = false } = {}) {
  const result = AiOutputSchema.safeParse(obj);
  if (!result.success) {
    return { ok: false, issues: result.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  if (requireImage && !result.data.image) return { ok: false, issues: ['image: required for screenshot analysis'] };
  return { ok: true, data: result.data };
}

/** Translate SDK / network errors into safe, user-facing AppErrors. Never leaks the key. */
export function mapAiError(err) {
  if (err instanceof AppError) return err;
  const status = Number(err?.status ?? err?.code);
  const msg = String(err?.message ?? '');
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || /aborted|timed? ?out/i.test(msg)) {
    return new AppError(ErrorCodes.AI_TIMEOUT, 'The AI analysis took too long and was cancelled. Please try again.', 504);
  }
  if (status === 401 || status === 403 || /api key not valid|API_KEY_INVALID|permission denied|unauthori[sz]ed/i.test(msg)) {
    return new AppError(ErrorCodes.AI_AUTH_FAILED, 'The AI provider rejected the configured API key. Check GEMINI_API_KEY on the server.', 502);
  }
  if (status === 404 || /not found|is not supported|unsupported model/i.test(msg)) {
    return new AppError(ErrorCodes.AI_MODEL_UNAVAILABLE, 'The configured Gemini model is unavailable. Check GEMINI_MODEL on the server.', 502);
  }
  if (status === 429 || /quota|rate limit|resource exhausted/i.test(msg)) {
    return new AppError(ErrorCodes.AI_RATE_LIMITED, 'The AI provider rate limit or quota was reached. Please wait and try again.', 429);
  }
  if (status === 400) {
    return new AppError(ErrorCodes.AI_UPSTREAM_ERROR, 'The AI provider could not process this request.', 502);
  }
  if (status >= 500 || /fetch failed|ECONN|ENOTFOUND|network/i.test(msg)) {
    return new AppError(ErrorCodes.AI_UPSTREAM_ERROR, 'The AI provider is temporarily unavailable. Please try again shortly.', 503);
  }
  return new AppError(ErrorCodes.AI_UPSTREAM_ERROR, 'The AI analysis failed unexpectedly.', 502);
}

/**
 * Gemini analysis service. `client` is injectable for tests; it must expose
 * `models.generateContent(params)` compatible with @google/genai.
 */
export function createGeminiService({ apiKey, model, fallbackModel = null, timeoutMs = 45000, client, retryDelayMs = 1500 } = {}) {
  const configured = Boolean(client || apiKey);
  const ai = client ?? (apiKey ? new GoogleGenAI({ apiKey }) : null);

  async function callOnce(params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await ai.models.generateContent({ ...params, config: { ...params.config, abortSignal: controller.signal } });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new AppError(ErrorCodes.AI_TIMEOUT, 'The AI analysis took too long and was cancelled. Please try again.', 504);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * @param {{inputType:'text'|'url'|'image', content?:string, image?:{buffer:Buffer, mime:string}, checks:object}} input
   * @returns {Promise<{output: object, model: string, attempts: number}>}
   */
  async function analyze({ inputType, content, image, checks }) {
    if (!configured) {
      throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Live AI analysis is unavailable because no Gemini API key is configured on the server.', 503);
    }
    const prompt = buildUserPrompt({ inputType, content, checks });
    const parts = [{ text: prompt }];
    if (inputType === 'image') {
      parts.push({ inlineData: { mimeType: image.mime, data: image.buffer.toString('base64') } });
    }
    const params = {
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: buildResponseJsonSchema({ includeImage: inputType === 'image' }),
      },
    };

    // On transient overload (503) try the fallback model if configured, otherwise
    // retry the primary once after a short backoff. Other errors fail immediately.
    const plan = fallbackModel && fallbackModel !== model ? [model, fallbackModel] : [model, model];
    let usedModel = model;
    const call = async () => {
      for (let i = 0; i < plan.length; i++) {
        usedModel = plan[i];
        try {
          return await callOnce({ ...params, model: usedModel });
        } catch (err) {
          const mapped = mapAiError(err);
          logger.warn('ai call failed', { code: mapped.code, status: err?.status, model: usedModel });
          const overloaded = mapped.code === ErrorCodes.AI_UPSTREAM_ERROR && mapped.status === 503;
          // Quotas are per model, so a 429 may succeed on the fallback — but never retry the same model on 429.
          const rateLimited = mapped.code === ErrorCodes.AI_RATE_LIMITED;
          const next = plan[i + 1];
          if (i === plan.length - 1 || !(overloaded || (rateLimited && next !== usedModel))) throw mapped;
          if (next === usedModel) await new Promise((r) => setTimeout(r, retryDelayMs));
        }
      }
      throw new AppError(ErrorCodes.AI_UPSTREAM_ERROR, 'The AI analysis failed unexpectedly.', 502);
    };

    let lastIssues = [];
    // One retry for malformed/invalid output.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await call();
      const blockReason = response?.promptFeedback?.blockReason;
      if (blockReason) {
        throw new AppError(ErrorCodes.AI_BLOCKED, 'The AI provider declined to analyse this content.', 422, { block_reason: String(blockReason) });
      }
      let parsed;
      try {
        parsed = parseModelJson(typeof response?.text === 'string' ? response.text : '');
      } catch {
        lastIssues = ['response was not valid JSON'];
        logger.warn('ai output not json', { attempt });
        continue;
      }
      const validated = validateAiOutput(parsed, { requireImage: inputType === 'image' });
      if (validated.ok) return { output: validated.data, model: usedModel, attempts: attempt };
      lastIssues = validated.issues;
      logger.warn('ai output failed schema', { attempt, issues: validated.issues.length });
    }
    throw new AppError(
      ErrorCodes.AI_INVALID_OUTPUT,
      'The AI returned a response that did not match the required investigation format, so it was discarded.',
      502,
      { issues: lastIssues },
    );
  }

  return { configured, model, fallbackModel, analyze };
}
