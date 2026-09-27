import { excerptAround } from './extractors.js';

/**
 * Explainable rule set for social-engineering language.
 * Each rule has a fixed category and strength; strength reflects how specific the
 * signal is to malicious messages (a password request is far more specific than
 * the word "urgent").
 */
export const TEXT_RULES = [
  // ── Business / SME fraud ────────────────────────────────────────────────
  {
    id: 'payment_change',
    name: 'Change of bank or payment details',
    category: 'payment_change_request',
    strength: 'strong',
    patterns: [
      /\b(our|my|the|their|supplier'?s?|vendor'?s?|new)\s+(bank(?:ing)?|account|payment|remittance)\s+(details|information|info|account|number)\s+(ha(?:s|ve)\s+)?(changed|been (?:changed|updated)|(?:is|are) now|updated)\b/i,
      /\b(pay|send|remit|transfer|make (?:the )?payment)\b[^.\n]{0,40}\b(?:in)?to (?:our|the|this|my) (?:new|updated|alternative|other) (?:bank )?account\b/i,
      /\b(update|change|amend)\b[^.\n]{0,30}\b(?:your|the)? ?records?\b[^.\n]{0,30}\b(new|updated) (?:bank|account|payment) (?:details|account|information)\b/i,
      /\b(do not|don'?t|no longer)\b[^.\n]{0,20}\b(use|pay (?:in)?to|send to)\b[^.\n]{0,20}\b(old|previous|usual) (?:bank )?account\b/i,
    ],
    explanation:
      'A request to send payments to new or changed bank details is the central step of invoice fraud and business email compromise. Always confirm changes using contact details already on file—not those in the message.',
  },
  {
    id: 'invoice_lure',
    name: 'Invoice or payment-release pressure',
    category: 'invoice_lure',
    strength: 'moderate',
    patterns: [
      /\b(overdue|outstanding|unpaid|updated|revised|final|attached|pending)\s+(invoice|payment|statement|remittance)\b/i,
      /\binvoice\s*(?:no\.?|number|#)\s*[\w-]+[^.\n]{0,60}\b(pay|payment|settle|due|today|urgent)\b/i,
      /\b(make|process|send|release) (?:the )?payment (?:for|of|on) (?:the )?invoice\b/i,
      /\b(process|release|approve|settle)\b[^.\n]{0,20}\b(the |this )?(payment|invoice|transfer)\b[^.\n]{0,40}\b(today|now|urgently|immediately|before|asap)\b/i,
    ],
    explanation:
      'Invoice-themed pressure is common in supplier impersonation. On its own it is normal business activity; it matters when combined with changed bank details, urgency, or an unfamiliar sender.',
  },
  {
    id: 'executive_request',
    name: 'Out-of-band request typical of executive impersonation',
    category: 'executive_impersonation',
    strength: 'moderate',
    patterns: [
      /\b(are you (?:available|at your desk|in the office|free)|i need (?:you to do )?a (?:quick )?favou?r|can you handle (?:a|an) (?:urgent|quick|confidential) (?:task|payment|transfer))\b/i,
      /\b(i'?m|i am) (?:in a meeting|travell?ing|on a flight|unavailable)\b[^.\n]{0,60}\b(can'?t|cannot|unable to) (?:talk|call|take calls)\b/i,
      /\b(reply|respond|text|message) (?:only )?(?:to|on) (?:this|my) (?:personal|private|new) (?:email|number|phone)\b/i,
    ],
    explanation:
      'Requests that avoid normal channels ("I\'m in a meeting, can\'t talk", "reply on my personal number") are a hallmark of executive or manager impersonation used to rush staff into payments or gift-card purchases.',
  },
  {
    id: 'overpayment_refund',
    name: 'Overpayment or refund-the-difference request',
    category: 'overpayment_scam',
    strength: 'moderate',
    patterns: [
      /\b(overpaid|over-paid|paid (?:you )?(?:in )?excess|sent (?:you )?(?:too much|extra|excess))\b[^.\n]{0,80}\b(refund|return|send back|reverse|balance)\b/i,
      /\b(refund|send back|return) (?:the )?(?:difference|balance|excess)\b/i,
    ],
    explanation:
      'Asking a business to refund an "overpayment" is a known fraud pattern: the original payment may be fake, reversed, or never arrive. Confirm funds have actually cleared in your own bank account before refunding anything.',
  },
  {
    id: 'job_offer_fee',
    name: 'Job or opportunity that requires an upfront fee',
    category: 'job_offer_lure',
    strength: 'moderate',
    patterns: [
      /\b(shortlisted|selected|hired|successful|qualified|approved)\b[^.\n]{0,80}\b(fee|pay|payment|charge|deposit)\b/i,
      /\b(registration|application|training|onboarding|uniform|medical|processing|form) fee\b[^.\n]{0,80}\b(job|employment|position|role|interview|offer|recruitment)\b/i,
      /\b(job|employment|position|role|interview|offer|recruitment)\b[^.\n]{0,80}\b(registration|application|training|onboarding|uniform|medical|form) fee\b/i,
    ],
    explanation:
      'Legitimate employers rarely ask candidates to pay to be hired, trained or interviewed. Upfront fees tied to a job offer are a common recruitment scam.',
  },
  {
    id: 'credential_request',
    name: 'Request for password, PIN or one-time code',
    category: 'credential_request',
    strength: 'strong',
    patterns: [
      /\b(enter|confirm|verify|update|provide|send|share|submit|reply with|give us|tell us|type)\b[^.\n]{0,40}\b(password|passcode|pin|otp|one[- ]time (?:password|code|pin)|verification code|security code|login details|credentials|recovery (?:code|phrase)|seed phrase|private key|secret phrase|2fa code|auth(?:entication)? code|token code)\b/i,
      /\b(otp|one[- ]time (?:password|code)|verification code|security code|\d-digit code)\b[^.\n]{0,40}\b(share|send|reply|tell|give|forward|read (?:it )?back)\b/i,
      /\breply with the \d[- ]digit code\b/i,
    ],
    negatable: true,
    explanation:
      'Legitimate organisations do not ask you to send passwords, PINs or one-time codes by message. Sharing them can give an attacker direct access to your account.',
  },
  {
    id: 'financial_request',
    name: 'Request for card or banking details',
    category: 'financial_request',
    strength: 'strong',
    patterns: [
      /\b(enter|confirm|verify|update|provide|send|share|submit|reply with|link|re-?validate|validate)\b[^.\n]{0,40}\b(card number|card details|cvv|cvc|expiry date|atm pin|card pin|bank (?:account|details)|account number|routing number|sort code|iban|bvn|nin|national identity number|social security number|ssn|billing (?:details|information))\b/i,
    ],
    negatable: true,
    explanation:
      'Requests to supply card numbers, security codes or bank details through a message or linked page are a common way to collect financial data for fraud.',
  },
  {
    id: 'payment_demand_high_risk',
    name: 'Payment via hard-to-reverse method',
    category: 'payment_demand',
    strength: 'strong',
    patterns: [
      /\b(gift ?cards?|itunes cards?|steam cards?|bitcoin|btc|crypto(?:currency)?|usdt|western union|moneygram|wire transfer)\b/i,
    ],
    explanation:
      'Requests to pay with gift cards, cryptocurrency or wire transfers are strongly associated with scams because these payments are difficult to trace or reverse.',
  },
  {
    id: 'payment_demand',
    name: 'Unexpected payment or fee request',
    category: 'payment_demand',
    strength: 'moderate',
    patterns: [
      /\b(pay|payment|settle|fee|charge|transfer)\b[^.\n]{0,40}(?:[$£€₦₹¥]\s?\d[\d,]*(?:\.\d{2})?|\b\d+(?:\.\d{2})?\s?(?:usd|gbp|eur|ngn|inr)\b)/i,
      /(?:[$£€₦₹¥]\s?\d[\d,.]*)[^.\n]{0,40}\b(fee|payment|charge|due|outstanding|unpaid)\b/i,
      /\b(redelivery|customs|processing|release|clearance|unlock) fee\b/i,
      /\b(send|transfer|pay)\b[^.\n]{0,20}(?:[$£€₦]\s?\d|\bn\d{1,3}(?:,\d{3})+\b)[^.\n]{0,60}\b(account|acct|opay|wallet|number)\b/i,
      /\b(unpaid|outstanding|overdue) (?:invoice|balance|fee|toll|bill)\b/i,
    ],
    // Completed-transaction notices ("your transfer of ₦7,500 was successful", debit/credit alerts,
    // "I have paid") describe a payment rather than ask for one.
    exclude: /\b(was|has been|have been) (successful|completed|received|credited|debited|processed|sent)\b|\bsuccessful(ly)?\b|\b(credit|debit) alert\b|\bi (?:have|'ve) (?:paid|sent|transferred)\b|\b(DR|CR)\b|\bbal(?:ance)?\s*:/,
    explanation:
      'The message asks for a payment. Unexpected fees—especially small ones—are often used to collect card details on a fraudulent payment page.',
  },
  {
    id: 'security_bypass',
    name: 'Request to bypass normal security or keep secret',
    category: 'security_bypass',
    strength: 'strong',
    patterns: [
      /\b(don'?t|do not) (?:tell|contact|inform|call|involve) (?:anyone|anybody|the bank|your bank|family|your manager|the police)\b/i,
      /\bkeep (?:this|it) (?:confidential|secret|between us|private)\b/i,
      // The same secrecy behaviour expressed in Nigerian Pidgin. The dialect itself is never a signal.
      /\b(?:no|make you no|abeg no|no go) tell (?:anybody|anyone|mummy|mommy|daddy|your (?:oga|manager|family|people))\b/i,
      /\b(disable|turn off) (?:your )?(?:antivirus|firewall|2fa|two[- ]factor|mfa|security)\b/i,
      /\b(install|download) (?:anydesk|teamviewer|rustdesk|ultraviewer|quick ?support|a remote (?:access|support) (?:app|tool))\b/i,
      /\b(bypass|skip) (?:the )?(?:usual|normal|standard) (?:process|procedure|approval|checks?)\b/i,
    ],
    explanation:
      'Asking you to keep a request secret, skip normal checks, disable protections or install remote-access software is a hallmark of social engineering.',
  },
  {
    id: 'macro_enable',
    name: 'Instruction to enable macros or editing',
    category: 'attachment_risk',
    strength: 'strong',
    patterns: [/\benable (?:macros|content|editing)\b/i],
    explanation:
      'Instructions to enable macros or content in a document are a well-known technique for running malicious code from attachments.',
  },
  {
    id: 'risky_file_reference',
    name: 'Reference to executable or archive file',
    category: 'attachment_risk',
    strength: 'moderate',
    patterns: [/\b[\w-]+\.(?:exe|scr|bat|cmd|js|vbs|jar|apk|msi|iso|img|zip|rar|7z|html?|docm|xlsm)\b/i],
    explanation:
      'The message references a file type that can run code or hide other files. Unexpected files of this type warrant caution. (Zodon did not open or scan any file.)',
  },
  {
    id: 'attachment_mention',
    name: 'Prompt to open an attachment',
    category: 'attachment_risk',
    strength: 'weak',
    patterns: [/\b(open|download|see|view|review|check) (?:the )?(?:attached|attachment|enclosed|document below)\b/i],
    explanation: 'The message directs you to an attachment. Unexpected attachments should be verified with the sender through a separate channel.',
  },
  {
    id: 'threat_consequence',
    name: 'Threat of account closure or penalty',
    category: 'threat_consequence',
    strength: 'moderate',
    patterns: [
      /\b(account|card|service|access|profile|number|mailbox|wallet)\b[^.\n]{0,40}\b(suspended|locked|blocked|closed|terminated|deactivated|disabled|restricted|frozen|deleted)\b/i,
      /\b(suspend|lock|block|close|terminate|deactivate|disable|restrict|freeze|delete)\b[^.\n]{0,20}\b(your )?(account|card|service|access|mailbox)\b/i,
      /\b(legal action|arrest warrant|be arrested|penalty|fined|court action|police)\b/i,
    ],
    explanation:
      'Threatening loss of access or legal trouble is used to frighten the recipient into acting before thinking.',
  },
  {
    id: 'urgency',
    name: 'Urgency or time pressure',
    category: 'urgency',
    strength: 'moderate',
    patterns: [
      /\b(urgent(?:ly)?|immediately|right away|act now|asap|final (?:notice|warning|reminder)|last chance|expires? (?:today|soon|shortly)|as soon as possible)\b/i,
      /\bwithin (?:the next )?\d+\s?(?:minutes?|mins?|hours?|hrs?|h)\b/i,
      /\b(?:in|within) 24 ?h(?:ours)?\b/i,
      /\b(?:today|tonight|end of (?:the )?day|eod)\b[^.\n]{0,30}\b(or|otherwise|before)\b/i,
    ],
    explanation:
      'Time pressure discourages the recipient from pausing to verify the request. On its own it is a weak signal—genuine reminders can be urgent too.',
  },
  {
    id: 'verification_lure',
    name: 'Request to verify account or identity',
    category: 'verification_lure',
    strength: 'moderate',
    patterns: [
      /\b(verify|confirm|validate|re-?activate|update|unlock) (?:your )?(?:identity|account|details|information|profile|mailbox|wallet)\b/i,
      /\bunusual (?:sign[- ]?in|login|activity|transaction)\b[^.\n]{0,60}\b(verify|confirm|click|tap|visit|log ?in)\b/i,
    ],
    negatable: true,
    explanation:
      'Messages asking you to "verify" an account via a link are a common phishing pattern. Legitimate services typically ask you to sign in through their official app or website instead.',
  },
  {
    id: 'reward_lure',
    name: 'Prize, refund or reward lure',
    category: 'reward_lure',
    strength: 'moderate',
    patterns: [
      /\b(you(?:'ve| have)? (?:won|been selected)|winner|claim your (?:prize|reward|refund|gift|bonus)|unclaimed (?:prize|funds|refund)|free (?:gift|iphone|reward)|lottery)\b/i,
    ],
    explanation: 'Unexpected prizes or refunds are used as bait to collect personal or payment details.',
  },
  {
    id: 'delivery_lure',
    name: 'Parcel delivery problem',
    category: 'delivery_lure',
    strength: 'moderate',
    patterns: [
      /\b(package|parcel|shipment|delivery|order)\b[^.\n]{0,50}\b(failed|pending|on hold|held|unable|missed|could not be delivered|reschedul\w*|returned to sender|awaiting)\b/i,
    ],
    explanation:
      'Fake delivery notices are a frequent smishing theme because most people are expecting a parcel at some point.',
  },
  {
    id: 'call_to_action',
    name: 'Instruction to click or tap a link',
    category: 'call_to_action',
    strength: 'moderate',
    patterns: [
      /\b(click|tap|visit|follow|open|go to|log ?in (?:at|via|using)|sign ?in (?:at|via))\b[^.\n]{0,25}\b(link|here|below|button|url|https?:\/\/|www\.)/i,
      /\b(click|tap) here\b/i,
    ],
    explanation: 'The message pushes the recipient to open a link rather than navigating to a known website independently.',
    requiresUrl: false,
  },
  {
    id: 'contact_redirect',
    name: 'Redirect to phone or messaging contact',
    category: 'contact_redirect',
    strength: 'weak',
    patterns: [
      /\b(call|text|whatsapp|message|contact) (?:us|me|our (?:agent|team|support|hotline))? ?(?:on|at|via)?\s*\+?\d[\d\s().-]{6,}/i,
      /\b(add me on|message me on|reach me on) (?:whatsapp|telegram|signal)\b/i,
    ],
    explanation:
      'Moving the conversation to a phone number or messaging app supplied in the message avoids official channels. Verify numbers using the organisation\'s official website instead.',
  },
  {
    id: 'new_number_pretext',
    name: 'Claims to be a known contact on a new or borrowed number',
    category: 'impersonation',
    strength: 'moderate',
    patterns: [
      /\b(this is my new (?:number|line|whatsapp)|i(?:'m| am| dey) (?:using|use) (?:my )?(?:friend|friend'?s|colleague'?s|someone'?s) (?:phone|line|number)|my (?:phone|sim|line) (?:got stolen|was stolen|spoil|is spoilt|is bad|is not working)|i lost my phone)\b/i,
    ],
    explanation:
      'Messages claiming to come from a friend, relative or colleague on a new or borrowed number are a common way to impersonate someone you trust. Call the person on the number you already have before acting.',
  },
  {
    id: 'generic_greeting',
    name: 'Generic greeting or authority claim',
    category: 'impersonation',
    strength: 'weak',
    patterns: [
      /\bdear (?:customer|user|client|member|account holder|valued (?:customer|member|client)|sir\/madam|sir or madam)\b/i,
      /\b(?:from|this is) the (?:security|fraud|support|it|helpdesk|billing|compliance) (?:team|department|desk)\b/i,
      /\b(official notice|security alert|account alert)\b/i,
    ],
    explanation:
      'Generic greetings and vague authority claims can indicate a mass-sent message impersonating an organisation. Many legitimate messages also use them, so this is a weak signal.',
  },
];

const NEGATION_BEFORE = /\b(never|will not|won'?t|do not|don'?t|not|no one|nobody)\b[^.\n]{0,40}$/i;
const ADVISORY = [
  /\b(we|[a-z]+) (?:will )?never (?:ask|request|call|email|text)\b[^.\n]{0,60}\b(password|pin|code|otp|details|information)\b/i,
  /\bdo not share (?:this|your) (?:code|otp|password|pin)\b[^.\n]{0,40}\b(anyone|with)\b/i,
  /\b(?:open|use) (?:the|our|your) (?:official )?app\b|\bwebsite you normally use\b|\btype (?:our|the) address\b/i,
];

const KNOWN_BRANDS = [
  'paypal', 'apple', 'icloud', 'microsoft', 'outlook', 'office 365', 'amazon', 'netflix', 'google', 'gmail', 'facebook',
  'instagram', 'whatsapp', 'meta', 'dhl', 'fedex', 'ups', 'usps', 'royal mail', 'irs', 'hmrc', 'chase', 'wells fargo',
  'bank of america', 'hsbc', 'barclays', 'coinbase', 'binance', 'linkedin', 'docusign', 'dropbox', 'adobe', 'steam',
  // Common Nigerian banks, fintechs and agencies. A mention is only a weak "brand referenced" signal and
  // never evidence of fraud on its own — legitimate alerts mention the same names.
  'gtbank', 'gtco', 'access bank', 'first bank', 'firstbank', 'zenith bank', 'uba', 'fidelity bank', 'union bank', 'stanbic',
  'sterling bank', 'wema bank', 'fcmb', 'opay', 'moniepoint', 'palmpay', 'kuda', 'cbn', 'nibss', 'efcc', 'firs', 'nimc',
];
const INSTITUTION_WORDS = /\b(bank|banking|credit union|tax (?:office|authority|agency)|post(?:al)? service|courier|customs|police|government)\b/i;

function isNegated(text, index) {
  const before = text.slice(Math.max(0, index - 60), index);
  const sentenceStart = Math.max(before.lastIndexOf('.'), before.lastIndexOf('\n'));
  return NEGATION_BEFORE.test(before.slice(sentenceStart + 1));
}

/**
 * Analyse text with the rule set.
 * @param {string} text normalised text
 * @param {{source?: string, hasUrls?: boolean}} opts
 * @returns {{indicators: object[], mitigating: object[], brands: string[]}}
 */
export function analyzeText(text, { source = 'submitted_text' } = {}) {
  const indicators = [];
  const mitigating = [];
  if (!text) return { indicators, mitigating, brands: [] };

  for (const rule of TEXT_RULES) {
    for (const pattern of rule.patterns) {
      const m = pattern.exec(text);
      if (!m) continue;
      if (rule.negatable && isNegated(text, m.index)) continue;
      if (rule.exclude && rule.exclude.test(excerptAround(text, m.index, m[0].length))) continue;
      indicators.push({
        id: `rule:${rule.id}`,
        name: rule.name,
        category: rule.category,
        strength: rule.strength,
        evidence: excerptAround(text, m.index, m[0].length),
        match: m[0],
        explanation: rule.explanation,
        source,
        method: 'rule',
        kind: 'observed',
        polarity: 'risk',
      });
      break; // one hit per rule is enough — avoid double counting
    }
  }

  for (const pattern of ADVISORY) {
    const m = pattern.exec(text);
    if (!m) continue;
    mitigating.push({
      id: 'rule:security_advisory',
      name: 'Security-advisory language',
      category: 'security_advisory',
      strength: 'weak',
      evidence: excerptAround(text, m.index, m[0].length),
      match: m[0],
      explanation:
        'The message contains wording typical of legitimate security notices (for example, stating that passwords will never be requested or directing you to the official app). Attackers can copy this wording, so it lowers but does not remove risk.',
      source,
      method: 'rule',
      kind: 'observed',
      polarity: 'mitigating',
    });
    break;
  }

  const lower = text.toLowerCase();
  const brands = KNOWN_BRANDS.filter((b) => new RegExp(`\\b${b}\\b`, 'i').test(lower));
  const institution = INSTITUTION_WORDS.exec(text);
  if (brands.length || institution) {
    const label = brands.length ? brands.slice(0, 3).join(', ') : institution[0].toLowerCase();
    const idx = brands.length ? lower.search(new RegExp(`\\b${brands[0]}\\b`)) : institution.index;
    indicators.push({
      id: 'rule:brand_reference',
      name: 'References a brand or institution',
      category: 'brand_reference',
      strength: 'weak',
      evidence: excerptAround(text, idx, label.length),
      match: label,
      explanation:
        `The message references ${label}. This is only relevant if the message did not genuinely come from that organisation—Zodon cannot verify the sender.`,
      source,
      method: 'rule',
      kind: 'observed',
      polarity: 'risk',
    });
  }

  return { indicators, mitigating, brands };
}
