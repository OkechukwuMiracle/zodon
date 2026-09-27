import { parse as parseDomain } from 'tldts';
import { domainToUnicode } from 'node:url';

/**
 * Structural URL analysis. This module NEVER fetches, resolves or visits a URL.
 * Findings describe the shape of the URL only; they cannot establish whether the
 * destination is malicious.
 */

export const STRUCTURAL_NOTE =
  'Structural analysis only. Zodon did not visit this URL. URL structure alone cannot establish whether a site is malicious or safe.';

const SHORTENERS = new Set([
  'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly',
  'shorturl.at', 'rb.gy', 't.ly', 'tiny.cc', 's.id', 'lnkd.in', 'v.gd', 'shorte.st', 'bl.ink', 'short.io', 'qrco.de',
]);

// Brand → registrable domains Zodon treats as belonging to that brand. Deliberately
// small; a brand's absence from this list means "unknown", never "malicious".
export const BRAND_DOMAINS = {
  paypal: ['paypal.com', 'paypal.me', 'paypalobjects.com'],
  apple: ['apple.com', 'icloud.com', 'apple.news'],
  icloud: ['icloud.com', 'apple.com'],
  microsoft: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'microsoftonline.com', 'office365.com', 'sharepoint.com'],
  office365: ['office365.com', 'office.com', 'microsoft.com'],
  outlook: ['outlook.com', 'live.com', 'microsoft.com'],
  amazon: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.in', 'amazon.ca', 'amazon.fr', 'amazon.es', 'amazon.it', 'amazon.co.jp', 'amazonaws.com'],
  netflix: ['netflix.com'],
  google: ['google.com', 'google.co.uk', 'gmail.com', 'youtube.com', 'googleusercontent.com'],
  gmail: ['gmail.com', 'google.com'],
  facebook: ['facebook.com', 'fb.com', 'meta.com'],
  instagram: ['instagram.com'],
  whatsapp: ['whatsapp.com', 'whatsapp.net', 'wa.me'],
  linkedin: ['linkedin.com', 'lnkd.in'],
  dhl: ['dhl.com', 'dhl.de', 'dhl.co.uk'],
  fedex: ['fedex.com'],
  usps: ['usps.com', 'usps.gov'],
  ups: ['ups.com'],
  irs: ['irs.gov'],
  hmrc: ['hmrc.gov.uk', 'gov.uk'],
  chase: ['chase.com'],
  wellsfargo: ['wellsfargo.com'],
  bankofamerica: ['bankofamerica.com'],
  hsbc: ['hsbc.com', 'hsbc.co.uk'],
  barclays: ['barclays.com', 'barclays.co.uk'],
  coinbase: ['coinbase.com'],
  binance: ['binance.com'],
  docusign: ['docusign.com', 'docusign.net'],
  dropbox: ['dropbox.com'],
  adobe: ['adobe.com'],
  steam: ['steampowered.com', 'steamcommunity.com'],
};
const BRANDS = Object.keys(BRAND_DOMAINS);

const SECURITY_KEYWORDS = new Set([
  'login', 'signin', 'logon', 'secure', 'security', 'verify', 'verification', 'account', 'accounts', 'update', 'confirm',
  'auth', 'authenticate', 'wallet', 'banking', 'support', 'billing', 'unlock', 'recover', 'recovery', 'alert', 'service',
  'services', 'validate', 'suspended', 'helpdesk', 'webscr', 'session', 'reactivate', 'refund', 'redelivery', 'payment', 'pay',
]);
const TLD_LIKE_LABELS = new Set(['com', 'net', 'org', 'gov', 'edu', 'co', 'io', 'info', 'biz', 'mil']);
const DOWNLOAD_EXT = /\.(exe|scr|bat|cmd|msi|apk|jar|js|vbs|ps1|iso|img|dmg|zip|rar|7z|docm|xlsm|pptm)$/i;

const HOMOGLYPHS = [
  [/rn/g, 'm'], [/vv/g, 'w'], [/0/g, 'o'], [/1/g, 'l'], [/3/g, 'e'], [/4/g, 'a'], [/5/g, 's'], [/7/g, 't'], [/8/g, 'b'], [/\$/g, 's'],
];

function deHomoglyph(s) {
  return HOMOGLYPHS.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function finding(id, category, strength, name, evidence, explanation) {
  return { id: `url:${id}`, name, category, strength, evidence, explanation, source: 'url_structure', method: 'rule', kind: 'observed', polarity: 'risk' };
}

/**
 * Parse a user-supplied URL safely. Accepts http(s) and scheme-less inputs.
 * @returns {{ok: true, url: URL, schemeSpecified: boolean} | {ok: false, reason: string}}
 */
export function safeParseUrl(input) {
  if (typeof input !== 'string') return { ok: false, reason: 'URL must be a string.' };
  const raw = input.trim();
  if (!raw) return { ok: false, reason: 'URL is empty.' };
  if (raw.length > 2048) return { ok: false, reason: 'URL is longer than 2048 characters.' };
  if (/\s/.test(raw)) return { ok: false, reason: 'URL must not contain spaces.' };
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(raw);
  const hasAuthority = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  if (schemeMatch && (hasAuthority || !/^[^:]+:\d/.test(raw))) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return { ok: false, reason: `Only http and https URLs can be analysed (got "${scheme}:").` };
    }
  }
  const schemeSpecified = /^https?:\/\//i.test(raw);
  let url;
  try {
    url = new URL(schemeSpecified ? raw : `http://${raw}`);
  } catch {
    return { ok: false, reason: 'The value is not a valid URL.' };
  }
  if (!url.hostname || !(url.hostname.includes('.') || url.hostname.startsWith('['))) {
    return { ok: false, reason: 'The URL does not contain a valid hostname.' };
  }
  return { ok: true, url, schemeSpecified, raw };
}

/**
 * @param {string} input raw URL
 * @param {{contextText?: string}} opts contextText = surrounding message, used for name/domain correlation
 */
export function analyzeUrl(input, { contextText = '' } = {}) {
  const parsed = safeParseUrl(input);
  if (!parsed.ok) {
    return { input, valid: false, error: parsed.reason, findings: [], note: STRUCTURAL_NOTE };
  }
  const { url, schemeSpecified, raw } = parsed;
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const info = parseDomain(hostname, { allowPrivateDomains: false });
  const isIp = Boolean(info.isIp);
  const registrable = info.domain || null;
  const label = info.domainWithoutSuffix || '';
  const subdomain = info.subdomain || '';
  const subLabels = subdomain ? subdomain.split('.').filter(Boolean) : [];
  const unicodeHost = domainToUnicode(hostname) || hostname;
  const isPunycode = hostname.split('.').some((l) => l.startsWith('xn--'));
  const findings = [];
  const shown = raw.length > 140 ? `${raw.slice(0, 137)}…` : raw;

  // Userinfo ("@") trick: https://bank.com@evil.example/ really goes to evil.example
  const authorityRaw = raw.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
  if (authorityRaw.includes('@')) {
    findings.push(finding('userinfo', 'url_deceptive_structure', 'strong', 'Text before "@" in the address disguises the real host', shown,
      `Everything before "@" in a URL is ignored for navigation. The browser would actually go to "${hostname}", not the name shown first.`));
  }

  if (isIp) {
    findings.push(finding('ip_host', 'url_ip_host', 'moderate', 'Link uses a raw IP address instead of a domain', hostname,
      'Legitimate organisations almost always use named domains. IP-address links hide who operates the server and are common in phishing and malware delivery.'));
  } else if (/^(0x[0-9a-f]+|\d{8,10})$/i.test(authorityRaw.split('@').pop().split(':')[0])) {
    findings.push(finding('encoded_ip', 'url_obfuscation', 'strong', 'IP address written in encoded form', authorityRaw,
      'The host is an IP address written in hexadecimal or decimal form, a technique used to hide the real destination.'));
  }

  if (isPunycode) {
    findings.push(finding('punycode', 'url_punycode', 'moderate', 'Internationalised (punycode) domain', `${hostname} → ${unicodeHost}`,
      'The domain uses non-Latin or special characters encoded as punycode ("xn--"). These can be used to create addresses that look identical to well-known domains.'));
  }

  if (registrable && SHORTENERS.has(registrable)) {
    findings.push(finding('shortener', 'url_shortener', 'moderate', 'URL shortener hides the destination', registrable,
      'Shortened links conceal where they lead. Zodon did not expand the link, so the final destination is unknown.'));
  }

  // Domain-like label inside the subdomain: login.bank.com.evil.co
  const tldLike = subLabels.find((l) => TLD_LIKE_LABELS.has(l));
  if (tldLike && subLabels.length >= 2) {
    findings.push(finding('embedded_domain', 'url_deceptive_structure', 'strong', 'Another domain name is embedded in the subdomain', hostname,
      `The address contains ".${tldLike}." before the real domain, so it can look like it belongs to "${subLabels.slice(-2).join('.')}". The registrable domain is actually "${registrable}".`));
  }

  if (subLabels.length >= 4) {
    findings.push(finding('many_subdomains', 'url_excessive_subdomains', 'moderate', 'Excessive number of subdomains', hostname,
      `The host has ${subLabels.length} subdomain levels, which can push the real domain out of view on small screens.`));
  }

  // Brand checks
  const hostTokens = [...subLabels, label].flatMap((l) => l.split('-')).filter(Boolean);
  const officialFor = (brand) => BRAND_DOMAINS[brand].includes(registrable);
  // Token match only (not raw substring) so "pineapple" ≠ "apple" and "purchase" ≠ "chase".
  // Allows brand glued to a security keyword, e.g. "paypalsecure" or "secureapple".
  const tokenMatchesBrand = (token, brand) =>
    token === brand ||
    (token.startsWith(brand) && SECURITY_KEYWORDS.has(token.slice(brand.length))) ||
    (token.endsWith(brand) && SECURITY_KEYWORDS.has(token.slice(0, -brand.length)));
  let brandFlagged = false;
  if (registrable && !isIp) {
    for (const brand of BRANDS) {
      if (officialFor(brand)) continue;
      if (label === brand) {
        findings.push(finding(`brand_suffix_${brand}`, 'url_brand_mismatch', 'moderate', `"${brand}" domain on an unlisted suffix`, registrable,
          `"${registrable}" uses the name "${brand}" but is not on Zodon's reference list of ${brand} domains. It may be a legitimate regional site or an impersonation—verify independently.`));
        brandFlagged = true;
        break;
      }
      if (hostTokens.some((t) => tokenMatchesBrand(t, brand))) {
        findings.push(finding(`brand_${brand}`, 'url_brand_mismatch', 'strong', `"${brand}" appears in the address but not as its domain`, hostname,
          `The address contains "${brand}", but the registrable domain is "${registrable}", which is not on Zodon's reference list of ${brand} domains. Brand names placed elsewhere in a URL are a common impersonation technique.`));
        brandFlagged = true;
        break;
      }
    }
    if (!brandFlagged) {
      const candidates = [label, ...label.split('-')].filter((t) => t.length >= 4);
      outer: for (const token of candidates) {
        for (const brand of BRANDS) {
          if (token === brand || officialFor(brand) || brand.length < 4) continue;
          const normalised = deHomoglyph(token);
          const distance = levenshtein(token, brand);
          if (normalised === brand || (brand.length >= 6 && distance === 1) || (brand.length >= 8 && distance === 2)) {
            findings.push(finding(`lookalike_${brand}`, 'url_lookalike', 'strong', `Domain resembles "${brand}"`, registrable,
              `"${token}" closely resembles "${brand}" (character substitution or small spelling change). Lookalike domains are used to impersonate trusted brands.`));
            brandFlagged = true;
            break outer;
          }
        }
      }
    }
  }

  // Correlation: a name used in the message appears only in the subdomain.
  if (contextText && registrable && !brandFlagged) {
    // Drop URL/domain-like tokens so the link cannot match itself; then compare against
    // single words and adjacent word pairs ("Northbridge Federal" ↔ "northbridgefederal").
    const words = contextText
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => !/[a-z0-9]\.[a-z]/.test(w) && !w.includes('/'))
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);
    const vocab = new Set(words);
    for (let i = 0; i < words.length - 1; i++) vocab.add(words[i] + words[i + 1]);
    const subTokens = subLabels
      .flatMap((l) => [l.replace(/-/g, ''), ...l.split('-')])
      .filter((t) => t.length >= 5 && !SECURITY_KEYWORDS.has(t) && !TLD_LIKE_LABELS.has(t) && t !== 'www');
    const hit = subTokens.find((t) => vocab.has(t) && !label.replace(/-/g, '').includes(t));
    if (hit) {
      findings.push(finding('name_in_subdomain', 'url_brand_mismatch', 'strong', 'Name from the message appears only in the subdomain', hostname,
        `"${hit}" is mentioned in the message and appears in the link's subdomain, but the domain that actually controls the link is "${registrable}".`));
    }
  }

  const keywordHits = label.split('-').filter((t) => SECURITY_KEYWORDS.has(t));
  if (keywordHits.length >= 1 && !BRANDS.some((b) => BRAND_DOMAINS[b].includes(registrable))) {
    findings.push(finding('keywords', 'url_keyword', keywordHits.length >= 2 ? 'moderate' : 'weak', 'Security-themed words in the domain name', registrable,
      `The domain itself contains "${keywordHits.join('", "')}". Attackers often register domains with words like these to look official; many legitimate sites do not.`));
  }

  const pctCount = (url.pathname + url.search).match(/%[0-9a-f]{2}/gi)?.length ?? 0;
  if (/%25[0-9a-f]{2}/i.test(raw) || pctCount >= 8) {
    findings.push(finding('encoding', 'url_obfuscation', 'moderate', 'Heavily encoded URL', shown,
      'The URL contains a large amount of percent-encoding (or double encoding), which can be used to hide its real content from people and filters.'));
  }

  if (schemeSpecified && url.protocol === 'http:') {
    findings.push(finding('http', 'url_insecure_scheme', 'weak', 'Uses unencrypted HTTP', `${url.protocol}//${hostname}`,
      'Data sent to this address would not be encrypted. This is a weak signal on its own: HTTPS does not mean a site is safe, and HTTP does not mean it is malicious.'));
  }

  if (url.port && !['80', '443'].includes(url.port)) {
    findings.push(finding('port', 'url_nonstandard_port', 'weak', 'Non-standard port', `${hostname}:${url.port}`,
      'The link specifies an unusual network port, which is uncommon for consumer websites.'));
  }

  if (DOWNLOAD_EXT.test(url.pathname)) {
    findings.push(finding('download', 'url_download', 'moderate', 'Link points directly to a file', url.pathname.split('/').pop(),
      'The link appears to point to an executable, script or archive. Zodon did not download or scan the file.'));
  }

  if (raw.length > 120) {
    findings.push(finding('long', 'url_long', 'weak', 'Unusually long URL', `${raw.length} characters`,
      'Very long URLs can hide the real domain. Length alone is a weak signal—many legitimate tracking links are long.'));
  }

  const params = [...url.searchParams.keys()];
  return {
    input: raw,
    valid: true,
    normalized: url.href,
    scheme: schemeSpecified ? url.protocol.replace(':', '') : 'not specified',
    hostname,
    unicode_hostname: unicodeHost !== hostname ? unicodeHost : null,
    registrable_domain: registrable,
    public_suffix: info.publicSuffix || null,
    subdomain: subdomain || null,
    subdomain_count: subLabels.length,
    path: url.pathname,
    has_query: params.length > 0,
    query_param_count: params.length,
    port: url.port || null,
    is_ip: isIp,
    is_punycode: isPunycode,
    is_shortener: Boolean(registrable && SHORTENERS.has(registrable)),
    findings,
    note: STRUCTURAL_NOTE,
  };
}
