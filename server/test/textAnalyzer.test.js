import { describe, it, expect } from 'vitest';
import { analyzeText } from '../src/services/security/textAnalyzer.js';
import { normalizeText, extractUrls, extractEmails, extractPhones } from '../src/services/security/extractors.js';

const cats = (text) => analyzeText(text).indicators.map((i) => i.category);

describe('extractors', () => {
  it('normalises whitespace and strips zero-width characters', () => {
    expect(normalizeText('  hello​   world \r\n\r\n\r\n\r\nbye ')).toBe('hello world\n\nbye');
  });
  it('extracts scheme, www and bare-domain URLs without trailing punctuation', () => {
    const urls = extractUrls('Go to https://a.example.com/x?y=1. Or www.test.org, or verify-now.info/login!');
    expect(urls).toEqual(['https://a.example.com/x?y=1', 'www.test.org', 'verify-now.info/login']);
  });
  it('does not treat emails or file names as URLs', () => {
    expect(extractUrls('mail me at bob@example.com about report.txt')).toEqual([]);
  });
  it('extracts emails and phone numbers', () => {
    expect(extractEmails('Contact Support@Example.com now')).toEqual(['support@example.com']);
    expect(extractPhones('Call +1 555 123 4567 today')).toHaveLength(1);
  });
});

describe('analyzeText', () => {
  it('detects password and OTP requests', () => {
    expect(cats('Please reply with the 6-digit code we sent you')).toContain('credential_request');
    expect(cats('Confirm your password at the link below')).toContain('credential_request');
    expect(cats('Share the OTP with our agent')).toContain('credential_request');
  });
  it('detects banking information requests', () => {
    expect(cats('Update your card number and CVV to continue')).toContain('financial_request');
  });
  it('detects urgency and threats', () => {
    const c = cats('URGENT: your account will be suspended within 24 hours');
    expect(c).toContain('urgency');
    expect(c).toContain('threat_consequence');
  });
  it('detects payment demands and hard-to-reverse payment methods', () => {
    expect(cats('Pay the $2.99 redelivery fee today')).toContain('payment_demand');
    const i = analyzeText('Buy Google Play gift cards and send the codes').indicators.find((x) => x.category === 'payment_demand');
    expect(i.strength).toBe('strong');
  });
  it('detects requests to bypass security', () => {
    expect(cats("Keep this confidential and don't tell anyone at the bank")).toContain('security_bypass');
    expect(cats('Please install AnyDesk so I can help')).toContain('security_bypass');
  });
  it('detects identity verification, delivery and reward lures', () => {
    expect(cats('Verify your identity to restore access')).toContain('verification_lure');
    expect(cats('Your parcel is on hold at our depot')).toContain('delivery_lure');
    expect(cats("Congratulations, you've won a free iPhone")).toContain('reward_lure');
  });
  it('detects risky attachments', () => {
    expect(cats('Open the attached invoice and enable macros')).toContain('attachment_risk');
  });
  it('ignores negated requests and records advisory language', () => {
    const r = analyzeText('We will never ask for your password or verification code by text.');
    expect(r.indicators.map((i) => i.category)).not.toContain('credential_request');
    expect(r.mitigating).toHaveLength(1);
  });
  it('returns structured, explainable indicators', () => {
    const [i] = analyzeText('Reply with the 6-digit code now').indicators;
    expect(i).toMatchObject({ category: 'credential_request', strength: 'strong', source: 'submitted_text', kind: 'observed' });
    expect(i.evidence).toContain('6-digit code');
    expect(i.explanation.length).toBeGreaterThan(20);
  });
  it('counts each rule at most once', () => {
    const r = analyzeText('Urgent! Act now! Immediately! ASAP!');
    expect(r.indicators.filter((i) => i.category === 'urgency')).toHaveLength(1);
  });
  it('finds nothing in ordinary text', () => {
    expect(analyzeText('Hi, are we still on for lunch tomorrow at noon?').indicators).toEqual([]);
  });
});
