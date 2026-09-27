/**
 * Live evaluation: runs every case in eval/cases.js through the real pipeline with Gemini
 * and writes the actual results to docs/evaluation/. Nothing is estimated or invented —
 * cases that fail upstream are recorded as errors, not guessed.
 *
 *   npm run eval:live -w server        (requires GEMINI_API_KEY)
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from '../src/config/env.js';
import { createGeminiService } from '../src/services/ai/gemini.service.js';
import { runInvestigation } from '../src/services/investigation.service.js';
import { CASES } from './cases.js';

if (!env.aiConfigured) {
  console.error('GEMINI_API_KEY is not set — live evaluation cannot run. (Offline checks: npm test)');
  process.exit(1);
}

const ai = createGeminiService({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, fallbackModel: env.GEMINI_FALLBACK_MODEL || null, timeoutMs: env.AI_TIMEOUT_MS });
const reputation = { configured: false, check: async () => ({ checked: false, provider: null, matches: [] }) };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/evaluation');
const jsonPath = resolve(outDir, 'live-results.json');

// Usage: run-live.js [--retry-errors] [case-id ...]
//   --retry-errors  re-run only cases that errored upstream last time, keeping earlier results
const args = process.argv.slice(2);
const retryErrors = args.includes('--retry-errors');
let only = args.filter((a) => !a.startsWith('--'));
let previous = [];
if ((retryErrors || only.length) && existsSync(jsonPath)) {
  previous = JSON.parse(readFileSync(jsonPath, 'utf8')).rows ?? [];
}
if (retryErrors) {
  only = previous.filter((r) => r.error).map((r) => r.id);
  console.log(`Re-running ${only.length} errored case(s).`);
}

const rows = [];
for (const c of CASES.filter((x) => !only.length || only.includes(x.id))) {
  const input = c.input.type === 'url' ? { inputType: 'url', url: c.input.url } : { inputType: 'text', text: c.input.text };
  const started = Date.now();
  try {
    const r = await runInvestigation(input, { ai, reputation });
    const aiItems = r.evidence.filter((e) => e.method === 'ai' && e.category !== 'ai_inference' && e.kind !== 'assumption');
    rows.push({
      id: c.id,
      group: c.group,
      label: c.label,
      expected: c.live.join('/'),
      severity: r.assessment.severity,
      classification: r.classification,
      ai_severity: r.assessment.ai_severity,
      ai_confidence: r.assessment.ai_confidence,
      evidence_strength: r.assessment.evidence_strength,
      model: r.ai.model,
      pass: c.live.includes(r.assessment.severity),
      ai_citations: r.citation_check?.ai_citations ?? aiItems.length,
      ai_citations_verified: r.citation_check?.ai_verified ?? 0,
      injection_flagged: c.group === 'Prompt injection' ? r.evidence.some((e) => /instruction/i.test(e.title)) : null,
      business_processes: r.business_context.processes.map((p) => p.process),
      ms: Date.now() - started,
      error: null,
    });
  } catch (err) {
    rows.push({ id: c.id, group: c.group, label: c.label, expected: c.live.join('/'), pass: false, error: `${err.code ?? err.name}: ${err.message}`, ms: Date.now() - started });
  }
  const last = rows.at(-1);
  console.log(`${last.pass ? 'PASS' : 'FAIL'}  ${c.id.padEnd(28)} ${last.error ?? `${last.severity} (${last.classification}) via ${last.model}`}`);
  await sleep(7000); // stay inside free-tier per-minute limits
}

// Merge with earlier results when re-running a subset, preserving case order.
if (previous.length) {
  const fresh = new Map(rows.map((r) => [r.id, r]));
  const merged = CASES.map((c) => fresh.get(c.id) ?? previous.find((p) => p.id === c.id)).filter(Boolean);
  rows.splice(0, rows.length, ...merged);
}

const ran = rows.filter((r) => !r.error);
const passed = rows.filter((r) => r.pass).length;
const byLabel = (label) => {
  const set = ran.filter((r) => r.label === label);
  return `${set.filter((r) => r.pass).length}/${set.length}`;
};
const cit = ran.reduce((a, r) => [a[0] + r.ai_citations_verified, a[1] + r.ai_citations], [0, 0]);

const date = new Date().toISOString();
const md = [
  '# Zodon: live evaluation results',
  '',
  `Run: ${date} · primary model \`${env.GEMINI_MODEL}\` · fallback \`${env.GEMINI_FALLBACK_MODEL || 'none'}\` · ${rows.length} cases from \`server/eval/cases.js\` (all synthetic, fictional organisations).`,
  '',
  'A case **passes** when Zodon\'s final severity is in the expected set for that case. This is a small, hand-labelled test set. These numbers describe this run only and are **not** a general accuracy claim.',
  '',
  `- Within expected range: **${passed}/${rows.length}** (suspicious ${byLabel('suspicious')}, legitimate ${byLabel('legitimate')}, ambiguous ${byLabel('ambiguous')})`,
  `- Upstream errors (not scored as results): ${rows.length - ran.length}`,
  `- AI-cited evidence verified verbatim in the submission: ${cit[0]}/${cit[1]} (unverified citations are shown as interpretations, not evidence)`,
  '',
  '| Case | Group | Label | Expected | Result | Classification | AI sev / conf | Evidence | Model | Pass |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => (r.error
    ? `| ${r.id} | ${r.group} | ${r.label} | ${r.expected} | error: ${r.error.replace(/\|/g, '/')} | | | | | n/a |`
    : `| ${r.id} | ${r.group} | ${r.label} | ${r.expected} | **${r.severity}** | ${r.classification} | ${r.ai_severity} / ${Math.round(r.ai_confidence * 100)}% | ${r.evidence_strength} | ${r.model} | ${r.pass ? 'yes' : '**no**'} |`)),
  '',
  '## Notes',
  '',
  ...rows.filter((r) => r.injection_flagged !== null && !r.error).map((r) => `- ${r.id}: injection attempt flagged as an indicator: ${r.injection_flagged ? 'yes' : 'no'}`),
  ...rows.filter((r) => r.business_processes?.length).map((r) => `- ${r.id}: business processes at risk: ${r.business_processes.join('; ')}`),
  '',
].join('\n');

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'live-results.md'), md);
writeFileSync(jsonPath, JSON.stringify({ date, model: env.GEMINI_MODEL, rows }, null, 2));
console.log(`\n${passed}/${rows.length} within expected range. Written to docs/evaluation/live-results.md`);
