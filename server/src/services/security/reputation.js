import { logger } from '../../utils/logger.js';

/**
 * Optional URL reputation lookup via Google Safe Browsing Lookup API v4.
 * Only runs when GOOGLE_SAFE_BROWSING_API_KEY is configured. The URL string is
 * sent to Google; the URL itself is never visited by Zodon.
 */
export function createReputationService({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  const configured = Boolean(apiKey);

  async function check(urls) {
    if (!configured || !urls.length) {
      return { checked: false, provider: null, reason: configured ? 'No URLs to check.' : 'No reputation service configured.', matches: [] };
    }
    const body = {
      client: { clientId: 'zodon', clientVersion: '1.0.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: urls.slice(0, 10).map((url) => ({ url })),
      },
    };
    try {
      const res = await fetchImpl(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        logger.warn('reputation lookup failed', { status: res.status });
        return { checked: false, provider: 'Google Safe Browsing', reason: `Lookup failed (HTTP ${res.status}).`, matches: [] };
      }
      const data = await res.json();
      const matches = (data.matches || []).map((m) => ({ url: m.threat?.url, threat_type: m.threatType }));
      return { checked: true, provider: 'Google Safe Browsing', reason: null, matches };
    } catch (err) {
      logger.warn('reputation lookup error', { name: err.name });
      return { checked: false, provider: 'Google Safe Browsing', reason: 'Lookup did not complete.', matches: [] };
    }
  }

  return { configured, check };
}
