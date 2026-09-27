import { describe, it, expect } from 'vitest';
import { CASES, LEVELS } from '../eval/cases.js';
import { runInvestigation } from '../src/services/investigation.service.js';
import { createGeminiService } from '../src/services/ai/gemini.service.js';
import { normalizeForMatch } from '../src/services/security/evidenceEngine.js';

const noAi = createGeminiService({ apiKey: '', model: 'none' });
const noRep = { configured: false, check: async () => ({ checked: false, provider: null, matches: [] }) };

/** Rules-only report via the real pipeline (AI unavailable → labelled partial report). */
async function rulesReport(input) {
  try {
    await runInvestigation(input.type === 'url' ? { inputType: 'url', url: input.url } : { inputType: 'text', text: input.text }, { ai: noAi, reputation: noRep });
  } catch (err) {
    return err.details.rules_only_report;
  }
  throw new Error('expected AI_UNAVAILABLE');
}

const rank = (l) => LEVELS.indexOf(l);

describe('evaluation cases — deterministic engine', () => {
  for (const c of CASES) {
    it(`${c.id} (${c.label})`, async () => {
      const r = await rulesReport(c.input);
      const observedRisk = r.evidence.filter((e) => e.kind === 'observed' && e.polarity === 'risk');
      const cats = new Set(observedRisk.map((e) => e.category));
      const level = r.assessment.evidence_level;

      if (c.rules.minLevel) expect(rank(level), `level ${level}`).toBeGreaterThanOrEqual(rank(c.rules.minLevel));
      if (c.rules.maxLevel) expect(rank(level), `level ${level}`).toBeLessThanOrEqual(rank(c.rules.maxLevel));
      for (const cat of c.rules.categories ?? []) expect([...cats], `missing ${cat}`).toContain(cat);
      if (c.rules.noStrong) expect(observedRisk.filter((e) => e.strength === 'strong').map((e) => e.title)).toEqual([]);
      if (c.business) expect(r.business_context.applies).toBe(true);
      if (c.label === 'legitimate') expect(r.business_context.applies).toBe(false);
    });
  }
});

describe('evidence citation accuracy', () => {
  it('every observed rule citation appears verbatim in the submission', async () => {
    for (const c of CASES) {
      const r = await rulesReport(c.input);
      const source = normalizeForMatch(c.input.text ?? c.input.url);
      for (const e of r.evidence.filter((x) => x.kind === 'observed' && x.method === 'rule' && x.evidence)) {
        if (e.evidence_type === 'url_component') {
          // URL findings cite a component of the URL (host, domain, path, or the URL itself)
          const url = r.url_analysis.find((u) => u.input === e.url || u.valid);
          const parts = [url.input, url.hostname, url.registrable_domain, url.path, `${url.hostname}:${url.port}`].map(normalizeForMatch);
          const cited = normalizeForMatch(e.evidence).replace(/…$/, '');
          expect(parts.some((p) => p && (p.includes(cited) || cited.includes(p))) || /characters$/.test(cited), `${c.id}: ${e.evidence}`).toBe(true);
        } else {
          for (const frag of e.evidence.split('…').map(normalizeForMatch).filter((f) => f.length > 3)) {
            expect(source, `${c.id}: "${frag}"`).toContain(frag);
          }
          if (e.match) expect(source).toContain(normalizeForMatch(e.match));
        }
      }
    }
  });
});

describe('fairness — local language and references are not evidence by themselves', () => {
  it('Nigerian names, Pidgin, Yoruba, naira and POS/transfer references produce no risk indicators in neutral messages', async () => {
    const neutral = [
      'Abeg, I don send the money for the fabric. Na ₦12,000 I transfer to your GTBank account. Check am.',
      'Ẹ ku irọlẹ. Mama Tolu said the POS machine for the shop is working again.',
      'Chinedu, your Opay transfer of ₦7,500 was successful. Ref: 20260912-8812.',
      'Aminu from Kano: I go call you tomorrow about the goods, no wahala.',
    ];
    for (const text of neutral) {
      const r = await rulesReport({ type: 'text', text });
      const risky = r.evidence.filter((e) => e.kind === 'observed' && e.polarity === 'risk' && e.category !== 'brand_reference');
      expect(risky.map((e) => e.title), text).toEqual([]);
      expect(['none', 'low']).toContain(r.assessment.evidence_level);
    }
  });
});
