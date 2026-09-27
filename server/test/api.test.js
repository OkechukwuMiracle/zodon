import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createGeminiService } from '../src/services/ai/gemini.service.js';
import { VALID_AI } from './fixtures.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const noRep = { configured: false, check: async () => ({ checked: false, provider: null, matches: [] }) };

function makeApp({ key = '', client, envOver = {} } = {}) {
  const env = loadEnv({ NODE_ENV: 'test', GEMINI_API_KEY: key, MAX_UPLOAD_MB: '0.5', ...envOver });
  const ai = client ? createGeminiService({ client, model: 'fake-model' }) : undefined;
  return createApp({ env, ai, reputation: noRep });
}
const aiReturning = (obj) => ({ models: { generateContent: async () => ({ text: JSON.stringify(obj) }) } });

describe('GET /api/health', () => {
  it('reports status without secrets', async () => {
    const res = await request(makeApp({ key: 'AIzaSECRET-should-not-leak' })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', version: '1.0.0', ai: { configured: true } });
    expect(JSON.stringify(res.body)).not.toContain('AIzaSECRET');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('input validation', () => {
  const app = makeApp();
  it('rejects empty text', async () => {
    const res = await request(app).post('/api/analyze/text').send({ text: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('rejects oversized text', async () => {
    const res = await request(app).post('/api/analyze/text').send({ text: 'a'.repeat(10001) });
    expect(res.status).toBe(400);
  });
  it('rejects unexpected fields and wrong types', async () => {
    expect((await request(app).post('/api/analyze/text').send({ text: 'hello there', extra: 1 })).status).toBe(400);
    expect((await request(app).post('/api/analyze/text').send({ text: 42 })).status).toBe(400);
  });
  it('rejects invalid URLs', async () => {
    for (const url of ['not a url', 'javascript:alert(1)', '']) {
      const res = await request(app).post('/api/analyze/url').send({ url });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
    }
  });
  it('rejects malformed JSON', async () => {
    const res = await request(app).post('/api/analyze/text').set('content-type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JSON/);
  });
  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('image upload validation', () => {
  const app = makeApp({ client: aiReturning({ ...VALID_AI, image: { readability: 'clear', extracted_text: 'Your account is locked. Verify your identity within 30 minutes' } }) });
  it('rejects a missing file', async () => {
    expect((await request(app).post('/api/analyze/image')).status).toBe(400);
  });
  it('rejects unsupported declared types', async () => {
    const res = await request(app).post('/api/analyze/image').attach('image', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(415);
  });
  it('rejects files whose content is not really an image (MIME spoofing)', async () => {
    const res = await request(app).post('/api/analyze/image').attach('image', Buffer.from('MZ fake exe content here'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
  });
  it('rejects oversized images with a helpful message', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(600 * 1024)]);
    const res = await request(app).post('/api/analyze/image').attach('image', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatchObject({ code: 'FILE_TOO_LARGE' });
    expect(res.body.error.message).toMatch(/0.5 MB/);
  });
  it('analyses a valid image and runs rules on the transcribed text', async () => {
    const res = await request(app).post('/api/analyze/image').attach('image', PNG, { filename: 'shot.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.report.input_type).toBe('image');
    expect(res.body.report.image.readability).toBe('clear');
    expect(res.body.report.evidence.some((e) => e.sources.includes('screenshot_text'))).toBe(true);
  });
});

describe('analysis endpoints', () => {
  it('missing API key → 503 with a clearly-labelled rule-only report', async () => {
    const res = await request(makeApp()).post('/api/analyze/text').send({ text: 'Reply with the 6-digit code at https://x-verify.com now' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    const partial = res.body.error.details.rules_only_report;
    expect(partial.mode).toBe('rules_only');
    expect(partial.ai.used).toBe(false);
    expect(partial.notices.join(' ')).toMatch(/not a complete AI investigation/);
  });

  it('malformed AI output → safe 502, not a crash', async () => {
    const app = makeApp({ client: { models: { generateContent: async () => ({ text: '{"not":"valid"}' }) } } });
    const res = await request(app).post('/api/analyze/text').send({ text: 'Hello, please check this message' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT');
    expect(res.body.error.details.rules_only_report.mode).toBe('rules_only');
  });

  it('upstream failure → mapped error without stack traces', async () => {
    const app = makeApp({ client: { models: { generateContent: async () => { throw Object.assign(new Error('Resource exhausted'), { status: 429 }); } } } });
    const res = await request(app).post('/api/analyze/url').send({ url: 'https://example.com' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('AI_RATE_LIMITED');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js:\d+/);
  });

  it('returns a full live report for text', async () => {
    const app = makeApp({ client: aiReturning(VALID_AI) });
    const res = await request(app).post('/api/analyze/text').send({ text: 'Verify your identity within 30 minutes: http://bank.com.verify-login.co/x' });
    expect(res.status).toBe(200);
    const r = res.body.report;
    expect(r.id).toMatch(/^ZOD-\d{8}-[A-Z0-9]{6}$/);
    expect(r).toMatchObject({ mode: 'live', input_type: 'text', ai: { used: true, status: 'completed', model: 'fake-model' } });
    expect(r.assessment).toHaveProperty('severity');
    expect(r.assessment).toHaveProperty('evidence_strength');
    expect(r.assessment.ai_confidence).toBe(0.87);
    expect(r.url_analysis[0].registrable_domain).toBe('verify-login.co');
    expect(r.limitations.join(' ')).toMatch(/did not visit/);
  });

  it('URL analysis does not fetch the URL', async () => {
    const original = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => { called = true; throw new Error('no'); };
    try {
      const res = await request(makeApp({ client: aiReturning(VALID_AI) })).post('/api/analyze/url').send({ url: 'https://paypa1.com/login' });
      expect(res.status).toBe(200);
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('samples are labelled synthetic and never claim a live AI run', async () => {
    const app = makeApp();
    const list = await request(app).get('/api/samples');
    expect(list.body.samples.length).toBe(7);
    expect(list.body.samples.every((s) => s.synthetic)).toBe(true);
    for (const s of list.body.samples) {
      const res = await request(app).post('/api/analyze/sample').send({ sample_id: s.id });
      expect(res.status).toBe(200);
      expect(res.body.report).toMatchObject({ mode: 'sample', ai: { used: false, status: 'sample', model: null }, sample: { synthetic: true } });
      expect(res.body.report.notices[0]).toMatch(/SYNTHETIC SAMPLE/);
    }
    expect((await request(app).post('/api/analyze/sample').send({ sample_id: 'nope' })).status).toBe(404);
  });

  it('rate limits analysis requests', async () => {
    const app = makeApp({ envOver: { RATE_LIMIT_ANALYZE_PER_10MIN: '2' } });
    await request(app).post('/api/analyze/url').send({ url: 'x' });
    await request(app).post('/api/analyze/url').send({ url: 'x' });
    const res = await request(app).post('/api/analyze/url').send({ url: 'x' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
