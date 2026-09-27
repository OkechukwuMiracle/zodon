import { describe, it, expect } from 'vitest';
import { correlateEvidence, excerptInCorpus } from '../src/services/security/evidenceEngine.js';
import { assessRisk, scoreEvidence, classifyFromEvidence } from '../src/services/security/riskEngine.js';
import { buildAttackPath, NO_PATH_MESSAGE } from '../src/services/security/attackPathBuilder.js';
import { buildRecommendations } from '../src/services/security/recommendations.js';
import { analyzeText } from '../src/services/security/textAnalyzer.js';
import { analyzeUrl } from '../src/services/security/urlAnalyzer.js';

const obs = (category, strength, extra = {}) => ({
  id: `t:${category}:${Math.random()}`, title: category, evidence: category, category, strength, kind: 'observed', polarity: 'risk', sources: ['submitted_text'], method: 'rule', ...extra,
});
const aiOut = (over = {}) => ({
  classification: 'phishing', severity: 'high', confidence: 0.8, summary: 's',
  observed_indicators: [], inferences: [], assumptions: [], attack_path: [], recommended_actions: [], missing_information: [], limitations: [], ...over,
});

describe('evidence correlation', () => {
  const text = 'URGENT: reply with the 6-digit code now or your account will be suspended.';
  const { indicators, mitigating } = analyzeText(text);

  it('verifies AI excerpts against the submission', () => {
    expect(excerptInCorpus('reply with the 6-digit code', text)).toBe(true);
    expect(excerptInCorpus('“Reply with the 6-DIGIT code…”', text)).toBe(true);
    expect(excerptInCorpus('send your bank PIN', text)).toBe(false);
  });

  it('merges AI indicators that duplicate rule indicators (no double counting)', () => {
    const ai = aiOut({ observed_indicators: [{ name: 'Urgency language', evidence: 'URGENT', explanation: 'x', source: 'submitted_text', confidence: 0.9 }] });
    const items = correlateEvidence({ textIndicators: indicators, mitigating, ai, corpus: text });
    const urgency = items.filter((i) => i.category === 'urgency');
    expect(urgency).toHaveLength(1);
    expect(urgency[0].corroborated).toBe(true);
    expect(urgency[0].sources).toEqual(['submitted_text', 'ai']);
  });

  it('downgrades AI evidence that is not in the submission to an interpretation', () => {
    const ai = aiOut({ observed_indicators: [{ name: 'Fake invoice attachment', evidence: 'invoice.zip attached', explanation: 'x', source: 'submitted_text', confidence: 0.9 }] });
    const items = correlateEvidence({ textIndicators: [], ai, corpus: text });
    const item = items.find((i) => i.title === 'Fake invoice attachment');
    expect(item.kind).toBe('interpretation');
    expect(item.verified_in_submission).toBe(false);
  });

  it('verifies AI quotes of deterministic findings and merges them with the URL finding', () => {
    const u = analyzeUrl('http://login.bank.com.verify-center.co/x');
    const f = u.findings.find((x) => x.id === 'url:embedded_domain');
    const ai = aiOut({ observed_indicators: [{ name: 'Deceptive embedded subdomain', evidence: `${f.name}: ${f.evidence}`, explanation: 'x', source: 'security_checks', confidence: 0.9 }] });
    const items = correlateEvidence({ urlAnalyses: [u], ai, corpus: 'msg', checksCorpus: `${f.name}: ${f.evidence}` });
    const merged = items.find((i) => i.id === 'url:embedded_domain');
    expect(merged.corroborated).toBe(true);
    expect(items.some((i) => i.title === 'Deceptive embedded subdomain')).toBe(false);
  });

  it('treats AI legitimacy signals as mitigating, never as risk', () => {
    const ai = aiOut({ observed_indicators: [{ name: 'No link present', evidence: 'reply with the 6-digit code', explanation: 'x', source: 'submitted_text', confidence: 0.9, indicates: 'legitimacy' }] });
    const items = correlateEvidence({ ai, corpus: text });
    expect(items[0]).toMatchObject({ polarity: 'mitigating', kind: 'observed' });
    expect(scoreEvidence(items).score).toBe(0);
  });

  it('labels inferences and assumptions distinctly', () => {
    const ai = aiOut({ inferences: [{ description: 'd', basis: 'b', confidence: 0.5 }], assumptions: ['a'] });
    const items = correlateEvidence({ textIndicators: [], ai, corpus: text, urlAnalyses: [analyzeUrl('https://example.com')] });
    expect(items.filter((i) => i.kind === 'interpretation')).toHaveLength(1);
    expect(items.filter((i) => i.kind === 'assumption').length).toBeGreaterThanOrEqual(2); // AI + "destination not visited"
  });

  it('deduplicates identical URL findings', () => {
    const u = analyzeUrl('http://1.2.3.4/');
    const items = correlateEvidence({ urlAnalyses: [u, u] });
    expect(items.filter((i) => i.id === 'url:ip_host')).toHaveLength(1);
  });
});

describe('risk engine', () => {
  it('counts only the strongest item per category', () => {
    const s = scoreEvidence([obs('urgency', 'moderate'), obs('urgency', 'moderate'), obs('urgency', 'weak')]);
    expect(s.score).toBe(2);
  });
  it('caps groups of weak/pressure signals', () => {
    const s = scoreEvidence(['urgency', 'threat_consequence', 'delivery_lure', 'reward_lure'].map((c) => obs(c, 'moderate')));
    expect(s.score).toBe(4);
    expect(s.level).toBe('medium');
  });
  it('never lets weak indicators alone reach critical or high', () => {
    const items = ['urgency', 'impersonation', 'url_insecure_scheme', 'url_long', 'brand_reference'].map((c) => obs(c, 'weak'));
    const r = assessRisk(items, aiOut({ severity: 'critical', confidence: 0.99 }));
    expect(['low', 'medium']).toContain(r.level);
    expect(r.rationale.join(' ')).toMatch(/capped/);
  });
  it('reaches critical only with multiple strong indicators and a strong request', () => {
    const items = [obs('credential_request', 'strong'), obs('url_lookalike', 'strong'), obs('urgency', 'moderate'), obs('threat_consequence', 'moderate'), obs('call_to_action', 'moderate')];
    const r = assessRisk(items, aiOut({ severity: 'critical', confidence: 0.9 }), { hasUrls: true });
    expect(r.level).toBe('critical');
    expect(r.evidence_strength).toBe('strong');
  });
  it('keeps severity, AI confidence and evidence strength separate', () => {
    const r = assessRisk([obs('urgency', 'moderate')], aiOut({ severity: 'medium', confidence: 0.33 }));
    expect(r).toMatchObject({ ai_confidence: 0.33, ai_severity: 'medium', evidence_strength: 'weak' });
    expect(r.level).toBe('medium');
  });
  it('returns inconclusive for no evidence and low AI confidence', () => {
    expect(assessRisk([], aiOut({ severity: 'low', confidence: 0.3 })).level).toBe('inconclusive');
    expect(assessRisk([], aiOut({ severity: 'inconclusive', confidence: 0.5 })).level).toBe('inconclusive');
  });
  it('returns low for no evidence and a confident benign AI verdict', () => {
    expect(assessRisk([], aiOut({ classification: 'benign', severity: 'low', confidence: 0.8 })).level).toBe('low');
  });
  it('rules-only mode is inconclusive without strong evidence', () => {
    expect(assessRisk([obs('urgency', 'moderate')], null).level).toBe('inconclusive');
    expect(assessRisk([obs('credential_request', 'strong')], null).level).toBe('medium');
  });
  it('limits AI down-grading when strong evidence exists', () => {
    const items = [obs('credential_request', 'strong'), obs('security_bypass', 'strong'), obs('urgency', 'moderate')];
    const r = assessRisk(items, aiOut({ classification: 'benign', severity: 'low', confidence: 0.95 }));
    expect(['medium', 'high']).toContain(r.level);
  });
  it('treats an unreadable screenshot as inconclusive', () => {
    expect(assessRisk([], aiOut({ severity: 'medium', confidence: 0.6 }), { imageReadability: 'unreadable' }).level).toBe('inconclusive');
  });
  it('classifies rules-only results from evidence', () => {
    expect(classifyFromEvidence([obs('credential_request', 'strong'), obs('call_to_action', 'moderate')], 'text')).toBe('phishing');
    expect(classifyFromEvidence([obs('payment_demand', 'moderate')], 'text')).toBe('financial_scam');
    expect(classifyFromEvidence([], 'text')).toBe('inconclusive');
  });
});

describe('attack path', () => {
  const risky = [obs('credential_request', 'strong'), obs('urgency', 'moderate'), obs('url_lookalike', 'strong', { url: 'x' })];
  const urlAnalyses = [analyzeUrl('https://paypa1.com/login')];

  it('builds observed then inferred steps when evidence supports it', () => {
    const risk = assessRisk(risky, null, { hasUrls: true });
    const p = buildAttackPath({ items: risky, risk, ai: null, inputType: 'text', urlAnalyses });
    expect(p.established).toBe(true);
    const statuses = p.steps.map((s) => s.status);
    expect(statuses[0]).toBe('observed');
    expect(statuses.lastIndexOf('observed')).toBeLessThan(statuses.indexOf('inferred'));
  });
  it('forces AI steps to "inferred" and never trusts AI "observed" steps', () => {
    const ai = aiOut({ attack_path: [{ step: 'AI says observed', detail: '', status: 'observed' }, { step: 'Fake login page', detail: '', status: 'inferred' }] });
    const risk = assessRisk(risky, ai, { hasUrls: true });
    const p = buildAttackPath({ items: risky, risk, ai, inputType: 'text', urlAnalyses });
    expect(p.steps.find((s) => s.step === 'AI says observed')).toBeUndefined();
    expect(p.steps.find((s) => s.step === 'Fake login page').status).toBe('inferred');
  });
  it('refuses to build a path without enough evidence', () => {
    const items = [obs('urgency', 'weak')];
    const risk = assessRisk(items, aiOut({ severity: 'low', confidence: 0.8 }));
    const p = buildAttackPath({ items, risk, ai: null, inputType: 'text' });
    expect(p).toEqual({ established: false, steps: [], message: NO_PATH_MESSAGE });
  });
});

describe('recommendations', () => {
  it('prioritises immediate actions and includes post-interaction guidance', () => {
    const items = [obs('credential_request', 'strong'), obs('call_to_action', 'moderate')];
    const recs = buildRecommendations({ risk: { level: 'high' }, items, ai: null, inputType: 'text' });
    expect(recs[0].priority).toBe('immediate');
    expect(recs.some((r) => r.scenario === 'credentials_entered')).toBe(true);
  });
  it('advises not opening a link even when the URL has no structural findings', () => {
    const recs = buildRecommendations({ risk: { level: 'high' }, items: [obs('payment_demand', 'moderate')], ai: null, inputType: 'image', hasUrls: true });
    expect(recs.map((r) => r.action)).toContain('Do not open the link.');
  });

  it('drops unsafe AI suggestions and duplicates', () => {
    const ai = aiOut({ recommended_actions: [
      { priority: 'immediate', action: 'Send your password to Zodon for checking', reason: 'x' },
      { priority: 'immediate', action: 'Do not open the link.', reason: 'dup' },
      { priority: 'soon', action: 'Tell your IT department', reason: 'y' },
    ] });
    const recs = buildRecommendations({ risk: { level: 'high' }, items: [obs('call_to_action', 'moderate')], ai, inputType: 'text' });
    expect(recs.filter((r) => r.source === 'ai').map((r) => r.action)).toEqual(['Tell your IT department']);
  });
  it('gives calm guidance for low risk', () => {
    const recs = buildRecommendations({ risk: { level: 'low' }, items: [], ai: null, inputType: 'text' });
    expect(recs[0].action).toMatch(/No immediate action/);
  });
});
