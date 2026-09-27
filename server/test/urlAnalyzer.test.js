import { describe, it, expect } from 'vitest';
import { analyzeUrl, safeParseUrl, levenshtein } from '../src/services/security/urlAnalyzer.js';

const ids = (r) => r.findings.map((f) => f.id);

describe('safeParseUrl', () => {
  it('accepts http, https and scheme-less URLs', () => {
    expect(safeParseUrl('https://example.com/a').ok).toBe(true);
    expect(safeParseUrl('example.com/login').ok).toBe(true);
    expect(safeParseUrl('example.com:8080/x').ok).toBe(true);
  });
  it('rejects dangerous or invalid input', () => {
    expect(safeParseUrl('javascript:alert(1)').ok).toBe(false);
    expect(safeParseUrl('data:text/html,hi').ok).toBe(false);
    expect(safeParseUrl('ftp://example.com').ok).toBe(false);
    expect(safeParseUrl('not a url').ok).toBe(false);
    expect(safeParseUrl('').ok).toBe(false);
    expect(safeParseUrl('localhost').ok).toBe(false);
    expect(safeParseUrl(`https://a.com/${'x'.repeat(2100)}`).ok).toBe(false);
  });
});

describe('analyzeUrl — structure extraction', () => {
  it('extracts hostname, registrable domain and subdomains', () => {
    const r = analyzeUrl('https://a.b.shop.example.co.uk/path?x=1&y=2');
    expect(r.valid).toBe(true);
    expect(r.hostname).toBe('a.b.shop.example.co.uk');
    expect(r.registrable_domain).toBe('example.co.uk');
    expect(r.subdomain).toBe('a.b.shop');
    expect(r.subdomain_count).toBe(3);
    expect(r.path).toBe('/path');
    expect(r.has_query).toBe(true);
    expect(r.query_param_count).toBe(2);
    expect(r.scheme).toBe('https');
  });

  it('does not flag a plain legitimate URL', () => {
    const r = analyzeUrl('https://www.wikipedia.org/wiki/Phishing');
    expect(r.findings).toEqual([]);
  });

  it('never claims maliciousness — always carries the structural note', () => {
    expect(analyzeUrl('https://example.com').note).toMatch(/did not visit/i);
  });

  it('treats HTTP alone as only a weak signal', () => {
    const r = analyzeUrl('http://example.com');
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ id: 'url:http', strength: 'weak' });
  });
});

describe('analyzeUrl — suspicious patterns', () => {
  it('detects IP-address hosts', () => {
    expect(ids(analyzeUrl('http://192.168.10.5/login'))).toContain('url:ip_host');
  });
  it('detects punycode hosts', () => {
    const r = analyzeUrl('https://xn--pypal-4ve.com/');
    expect(r.is_punycode).toBe(true);
    expect(ids(r)).toContain('url:punycode');
  });
  it('detects unicode hosts converted to punycode', () => {
    expect(analyzeUrl('https://pаypal.com/').is_punycode).toBe(true); // Cyrillic "а"
  });
  it('detects URL shorteners', () => {
    expect(ids(analyzeUrl('https://bit.ly/3abcXYZ'))).toContain('url:shortener');
  });
  it('detects a domain embedded in the subdomain', () => {
    const r = analyzeUrl('http://login.mybank.com.verify-center.co/secure');
    expect(ids(r)).toContain('url:embedded_domain');
    expect(r.registrable_domain).toBe('verify-center.co');
  });
  it('detects userinfo "@" tricks', () => {
    const r = analyzeUrl('https://paypal.com@evil.example/login');
    expect(ids(r)).toContain('url:userinfo');
    expect(r.hostname).toBe('evil.example');
  });
  it('detects lookalike brand domains via homoglyphs', () => {
    expect(ids(analyzeUrl('https://paypa1.com/signin'))).toContain('url:lookalike_paypal');
    expect(ids(analyzeUrl('https://arnazon.com'))).toContain('url:lookalike_amazon');
  });
  it('detects brand names used outside their domain', () => {
    expect(ids(analyzeUrl('https://paypal-secure-login.com'))).toContain('url:brand_paypal');
    expect(ids(analyzeUrl('https://paypal.account-check.net'))).toContain('url:brand_paypal');
  });
  it('does not flag real brand domains', () => {
    expect(analyzeUrl('https://www.paypal.com/signin').findings).toEqual([]);
    expect(analyzeUrl('https://accounts.google.com/').findings).toEqual([]);
  });
  it('does not flag brands that are merely substrings of words', () => {
    expect(ids(analyzeUrl('https://pineapple.com')).some((i) => i.includes('apple'))).toBe(false);
    expect(ids(analyzeUrl('https://purchase.com')).some((i) => i.includes('chase'))).toBe(false);
  });
  it('detects excessive subdomains', () => {
    expect(ids(analyzeUrl('https://a.b.c.d.example.com'))).toContain('url:many_subdomains');
  });
  it('detects heavy encoding, non-standard ports and file downloads', () => {
    expect(ids(analyzeUrl('https://example.com/%61%62%63%64%65%66%67%68%69'))).toContain('url:encoding');
    expect(ids(analyzeUrl('https://example.com:8443/'))).toContain('url:port');
    expect(ids(analyzeUrl('https://example.com/invoice.exe'))).toContain('url:download');
  });
  it('correlates a name from the message that appears only in the subdomain', () => {
    const r = analyzeUrl('https://northbridge.secure-portal.co/login', { contextText: 'Northbridge Bank: verify now' });
    expect(ids(r)).toContain('url:name_in_subdomain');
  });
  it('does not self-match the URL inside the message text', () => {
    const url = 'https://harborline.portal-example.co/x';
    const r = analyzeUrl(url, { contextText: `See ${url}` });
    expect(ids(r)).not.toContain('url:name_in_subdomain');
  });
  it('returns an invalid result instead of throwing', () => {
    const r = analyzeUrl('javascript:alert(1)');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/http/);
  });
});

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('paypal', 'paypal')).toBe(0);
    expect(levenshtein('paypal', 'paypall')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
});
