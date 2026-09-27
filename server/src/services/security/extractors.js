import { parse as parseDomain } from 'tldts';

/** Collapse runs of spaces/tabs, normalise line endings, strip control/zero-width chars. */
export function normalizeText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[ \t\u00A0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

const TRAILING_PUNCT = /[)\].,;:!?'"’”>]+$/;
const SCHEME_URL = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const WWW_URL = /\bwww\.[^\s<>"'`]+/gi;
// Bare domains such as "secure-verify.com/login" — validated against the public suffix list below.
const BARE_DOMAIN = /(?<![@\w.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?::\d{2,5})?(?:\/[^\s<>"'`]*)?/gi;
const EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}\b/gi;
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/g;

function cleanUrlToken(token) {
  let t = token.replace(TRAILING_PUNCT, '');
  // Balance a trailing ")" that belongs to surrounding prose.
  if (t.endsWith(')') && !t.includes('(')) t = t.slice(0, -1);
  return t;
}

/** Extract URLs without fetching them. Returns unique strings in order of appearance. */
export function extractUrls(text, max = 10) {
  if (!text) return [];
  const found = [];
  const spans = [];
  const push = (raw, index) => {
    const url = cleanUrlToken(raw);
    if (!url || url.length < 4) return;
    if (spans.some(([s, e]) => index >= s && index < e)) return;
    spans.push([index, index + raw.length]);
    if (!found.includes(url)) found.push(url);
  };
  for (const m of text.matchAll(SCHEME_URL)) push(m[0], m.index);
  for (const m of text.matchAll(WWW_URL)) push(m[0], m.index);
  const emailSpans = [...text.matchAll(EMAIL)].map((m) => [m.index, m.index + m[0].length]);
  for (const m of text.matchAll(BARE_DOMAIN)) {
    if (emailSpans.some(([s, e]) => m.index >= s && m.index < e)) continue;
    const candidate = cleanUrlToken(m[0]);
    const host = candidate.split(/[/:]/)[0];
    const info = parseDomain(host);
    // Only accept ICANN suffixes to avoid treating "file.txt" or "e.g" as a domain.
    if (!info.domain || !info.isIcann) continue;
    if (/^\d+(\.\d+)*$/.test(host)) continue;
    push(m[0], m.index);
  }
  return found.slice(0, max);
}

export function extractEmails(text, max = 10) {
  if (!text) return [];
  return [...new Set([...text.matchAll(EMAIL)].map((m) => m[0].toLowerCase()))].slice(0, max);
}

export function extractPhones(text, max = 10) {
  if (!text) return [];
  const results = [];
  for (const m of text.matchAll(PHONE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) continue;
    // Skip values that are clearly dates, times or amounts embedded in URLs.
    const before = text.slice(Math.max(0, m.index - 1), m.index);
    if (/[/=&#.]/.test(before)) continue;
    const value = m[0].trim();
    if (!results.includes(value)) results.push(value);
  }
  return results.slice(0, max);
}

/** Return a short excerpt around a match — the sentence/line containing it, trimmed. */
export function excerptAround(text, index, length, maxLen = 180) {
  const lineStart = Math.max(
    text.lastIndexOf('\n', index) + 1,
    ...['. ', '! ', '? '].map((p) => {
      const i = text.lastIndexOf(p, index - 1);
      return i === -1 ? 0 : i + 2;
    }),
  );
  let lineEnd = text.length;
  for (const p of ['\n', '. ', '! ', '? ']) {
    const i = text.indexOf(p, index + length);
    if (i !== -1 && i + 1 < lineEnd) lineEnd = i + 1;
  }
  let excerpt = text.slice(lineStart, lineEnd).trim();
  if (excerpt.length > maxLen) {
    const rel = index - lineStart;
    const start = Math.max(0, rel - Math.floor((maxLen - length) / 2));
    excerpt = (start > 0 ? '…' : '') + excerpt.slice(start, start + maxLen).trim() + '…';
  }
  return excerpt;
}
