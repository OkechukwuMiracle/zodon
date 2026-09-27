import { describe, it, expect } from 'vitest';
import { buildBusinessContext } from '../src/services/security/businessContext.js';
import { analyzeText } from '../src/services/security/textAnalyzer.js';
import { correlateEvidence } from '../src/services/security/evidenceEngine.js';

const itemsFor = (text) => correlateEvidence({ ...analyzeText(text), textIndicators: analyzeText(text).indicators, corpus: text });

describe('SME business context', () => {
  it('maps a supplier bank-detail change to accounts payable with concrete checks', () => {
    const ctx = buildBusinessContext({ items: itemsFor('Please note our bank details have changed. Kindly make payment for invoice INV-9 to our new account.'), ai: null, severity: 'high' });
    expect(ctx.applies).toBe(true);
    expect(ctx.processes[0].process).toMatch(/Supplier payments/);
    expect(ctx.processes[0].verify.join(' ')).toMatch(/number already in your records/);
  });

  it('does not treat a personal secrecy + payment request as a business process', () => {
    const ctx = buildBusinessContext({ items: itemsFor('Abeg send ₦50,000 to this NairaPay account 8123456789. No tell mummy o.'), ai: null, severity: 'high' });
    expect(ctx.applies).toBe(false);
  });

  it('ignores AI-suggested processes for low-severity results and dedupes similar names', () => {
    const ai = { business_impact: { processes_at_risk: ['Supplier payments', 'Payroll'], verify_independently: ['Call the supplier'] } };
    expect(buildBusinessContext({ items: [], ai, severity: 'low' }).applies).toBe(false);
    // No business signal (e.g., a consumer phishing URL): AI-only processes are ignored.
    expect(buildBusinessContext({ items: [], ai: { ...ai, classification: 'phishing' }, severity: 'high' }).applies).toBe(false);
    const ctx = buildBusinessContext({ items: itemsFor('Our bank details have changed, pay into our new account.'), ai, severity: 'high' });
    expect(ctx.processes.map((p) => p.process)).toEqual(['Supplier payments (accounts payable)', 'Payroll']);
    expect(ctx.processes[1].source).toBe('ai');
  });
});

describe('SME and job-offer rules', () => {
  const cats = (t) => analyzeText(t).indicators.map((i) => i.category);
  it('detects executive impersonation, overpayment refunds and job fees', () => {
    expect(cats("Are you at your desk? I'm in a meeting and can't talk.")).toContain('executive_impersonation');
    expect(cats('I overpaid by mistake, please refund the difference today.')).toContain('overpayment_scam');
    expect(cats('You have been shortlisted. Pay the registration fee of ₦10,000 for the interview.')).toContain('job_offer_lure');
  });
  it('does not flag completed-transaction notices as payment requests', () => {
    expect(cats('Your transfer of ₦7,500 was successful.')).not.toContain('payment_demand');
    expect(cats('I have paid ₦45,000 for the order, please confirm.')).not.toContain('payment_demand');
  });
  it('treats visual screenshot claims as AI-described and weaker', () => {
    const ai = {
      observed_indicators: [{ name: 'Fake bank logo', evidence: 'Visual: bank logo above a Verify now button', explanation: 'x', source: 'screenshot', confidence: 0.9, indicates: 'risk' }],
      inferences: [], assumptions: [], image: { visual_observations: ['A bank logo appears above a green Verify now button'] },
    };
    const [item] = correlateEvidence({ ai, corpus: 'some text', inputType: 'image' });
    expect(item).toMatchObject({ evidence_type: 'visual', kind: 'observed', strength: 'weak' });
    expect(item.explanation).toMatch(/cannot independently verify image content/);
  });
});
