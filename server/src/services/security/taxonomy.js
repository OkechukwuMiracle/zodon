/**
 * Shared indicator taxonomy. Every deterministic or AI indicator is mapped to one
 * category so the risk engine can deduplicate by category instead of counting
 * the same signal several times.
 */
export const STRENGTH_WEIGHT = { strong: 3, moderate: 2, weak: 1 };

export const CATEGORIES = {
  credential_request: { label: 'Credential / code request', group: 'request' },
  financial_request: { label: 'Financial information request', group: 'request' },
  payment_demand: { label: 'Payment demand', group: 'request' },
  security_bypass: { label: 'Security bypass or secrecy request', group: 'request' },
  payment_change_request: { label: 'Bank / payment details change', group: 'request' },
  overpayment_scam: { label: 'Overpayment refund request', group: 'request' },
  invoice_lure: { label: 'Invoice or payment-release pressure', group: 'business' },
  executive_impersonation: { label: 'Executive / manager impersonation pattern', group: 'identity' },
  job_offer_lure: { label: 'Job offer with upfront fee', group: 'pressure' },
  attachment_risk: { label: 'Attachment / file risk', group: 'delivery' },
  call_to_action: { label: 'Call to action on link', group: 'delivery' },
  link_present: { label: 'Embedded link', group: 'delivery' },
  contact_redirect: { label: 'Redirect to unofficial contact', group: 'delivery' },
  urgency: { label: 'Urgency / time pressure', group: 'pressure' },
  threat_consequence: { label: 'Threat of negative consequence', group: 'pressure' },
  reward_lure: { label: 'Prize or reward lure', group: 'pressure' },
  delivery_lure: { label: 'Delivery problem lure', group: 'pressure' },
  verification_lure: { label: 'Account verification lure', group: 'pressure' },
  impersonation: { label: 'Generic or authority impersonation', group: 'identity' },
  brand_reference: { label: 'Brand or institution referenced', group: 'identity' },
  url_deceptive_structure: { label: 'Deceptive URL structure', group: 'url' },
  url_lookalike: { label: 'Lookalike domain', group: 'url' },
  url_brand_mismatch: { label: 'Brand name outside its domain', group: 'url' },
  url_ip_host: { label: 'IP-address host', group: 'url' },
  url_punycode: { label: 'Internationalised / punycode host', group: 'url' },
  url_shortener: { label: 'URL shortener', group: 'url' },
  url_obfuscation: { label: 'Encoded or obfuscated URL', group: 'url' },
  url_insecure_scheme: { label: 'Unencrypted HTTP', group: 'url' },
  url_keyword: { label: 'Security-themed keywords in domain', group: 'url' },
  url_download: { label: 'Direct file download link', group: 'url' },
  url_nonstandard_port: { label: 'Non-standard port', group: 'url' },
  url_excessive_subdomains: { label: 'Excessive subdomains', group: 'url' },
  url_long: { label: 'Unusually long URL', group: 'url' },
  reputation_flagged: { label: 'Flagged by reputation service', group: 'reputation' },
  ai_other: { label: 'Other AI-identified indicator', group: 'other' },
  security_advisory: { label: 'Legitimate security advisory language', group: 'mitigating' },
};

export function categoryLabel(category) {
  return CATEGORIES[category]?.label ?? category;
}

/** Map free-form indicator names (e.g. from the AI) onto the taxonomy. */
const SECRET = String.raw`(password|passcode|otp|one[- ]time|verification code|\d-digit code|security code|credential|login details|pin\b|2fa|mfa|recovery)`;
const ASK = String.raw`(request|ask|share|send|reply|enter|provide|disclos|harvest|steal|theft|phish)`;
const KEYWORD_MAP = [
  [/(bank|account|payment|remittance) (details )?(change|update)|changed (bank|account|payment)|new (bank )?account details|payment[- ]change/i, 'payment_change_request'],
  [/overpay|refund the difference/i, 'overpayment_scam'],
  [/ceo|executive|manager|director|boss|business email compromise|\bbec\b/i, 'executive_impersonation'],
  [/invoice/i, 'invoice_lure'],
  [/job|recruit|employment|hiring/i, 'job_offer_lure'],
  [new RegExp(`${ASK}\\w*[^.]{0,40}${SECRET}|${SECRET}[^.]{0,40}${ASK}`, 'i'), 'credential_request'],
  [/card|cvv|bank (account|details)|account number|iban|routing|ssn|social security|financial info/i, 'financial_request'],
  [/payment|fee|gift card|crypto|bitcoin|wire|transfer|invoice|money/i, 'payment_demand'],
  [/secre|confidential|bypass|remote access|anydesk|teamviewer|don'?t tell/i, 'security_bypass'],
  [/attach|macro|download|file|executable/i, 'attachment_risk'],
  [/urgen|pressure|time[- ]limit|deadline|immediate|expire/i, 'urgency'],
  [/threat|suspend|lock|clos|penalt|legal|arrest/i, 'threat_consequence'],
  [/prize|reward|won|lottery|refund|giveaway/i, 'reward_lure'],
  [/deliver|parcel|package|shipment|courier/i, 'delivery_lure'],
  [/verif|confirm (your )?(identity|account)|unusual (activity|sign)/i, 'verification_lure'],
  [/lookalike|look-alike|typosquat|homoglyph/i, 'url_lookalike'],
  [/shorten/i, 'url_shortener'],
  [/punycode|idn|homograph/i, 'url_punycode'],
  [/ip address|ip-based|ip host/i, 'url_ip_host'],
  [/embedded (domain|subdomain)|deceptive (url|subdomain|domain structure)|domain.{0,20}subdomain|@ in (url|address)/i, 'url_deceptive_structure'],
  [/unencrypted|\bhttp\b(?!s)|insecure (scheme|connection)/i, 'url_insecure_scheme'],
  [/domain|url|link|hostname|subdomain/i, 'link_present'],
  [/impersonat|spoof|brand|pretend|posing|masquerad/i, 'impersonation'],
  [/generic greeting|dear customer|salutation/i, 'impersonation'],
];

/**
 * Categorise by indicator name only. Explanations are speculative ("may ask for login
 * details") and would inflate categories that the evidence does not support.
 */
export function categorizeName(name = '') {
  for (const [re, cat] of KEYWORD_MAP) if (re.test(name)) return cat;
  return 'ai_other';
}
