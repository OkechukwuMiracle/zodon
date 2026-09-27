import { z } from 'zod';

export const CLASSIFICATIONS = [
  'phishing',
  'social_engineering',
  'brand_impersonation',
  'credential_theft',
  'financial_scam',
  'malware_delivery',
  'suspicious_url',
  'business_email_compromise',
  'spam',
  'benign',
  'inconclusive',
];
export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'inconclusive'];

const CLASSIFICATION_ALIASES = {
  credential_theft_attempt: 'credential_theft',
  credential_harvesting: 'credential_theft',
  impersonation: 'brand_impersonation',
  scam: 'financial_scam',
  fraud: 'financial_scam',
  malware: 'malware_delivery',
  malware_delivery_indicators: 'malware_delivery',
  suspicious_or_potentially_malicious_url: 'suspicious_url',
  malicious_url: 'suspicious_url',
  legitimate: 'benign',
  benign_or_legitimate_looking: 'benign',
  unknown: 'inconclusive',
  unknown_or_inconclusive: 'inconclusive',
  smishing: 'phishing',
  bec: 'business_email_compromise',
  invoice_fraud: 'business_email_compromise',
  payment_diversion: 'business_email_compromise',
  supplier_impersonation: 'business_email_compromise',
  job_scam: 'financial_scam',
  recruitment_scam: 'financial_scam',
};

const text = (max) =>
  z.string().trim().min(1).transform((s) => (s.length > max ? `${s.slice(0, max - 1)}…` : s));

const confidence = z.preprocess((v) => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n === 'number' && n > 1 && n <= 100) return n / 100;
  return n;
}, z.number().min(0).max(1));

const enumLoose = (values, aliases = {}) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    const k = v.trim().toLowerCase().replace(/[\s/-]+/g, '_');
    return aliases[k] ?? k;
  }, z.enum(values));

const cappedArray = (schema, max) => z.array(schema).transform((a) => a.slice(0, max));

export const AiIndicatorSchema = z.object({
  name: text(120),
  evidence: text(400),
  explanation: text(500),
  source: enumLoose(['submitted_text', 'submitted_url', 'screenshot', 'security_checks'], {
    text: 'submitted_text',
    message: 'submitted_text',
    url: 'submitted_url',
    image: 'screenshot',
    deterministic_checks: 'security_checks',
  }),
  confidence,
  indicates: enumLoose(['risk', 'legitimacy'], { benign: 'legitimacy', legitimate: 'legitimacy', safe: 'legitimacy', malicious: 'risk', suspicious: 'risk' })
    .optional()
    .default('risk'),
});

export const AiOutputSchema = z.object({
  classification: enumLoose(CLASSIFICATIONS, CLASSIFICATION_ALIASES),
  severity: enumLoose(SEVERITIES, { none: 'low', info: 'low', informational: 'low', unknown: 'inconclusive' }),
  confidence,
  summary: text(900),
  observed_indicators: cappedArray(AiIndicatorSchema, 12),
  inferences: cappedArray(
    z.object({ description: text(400), basis: text(400), confidence }),
    8,
  ),
  assumptions: cappedArray(text(300), 6).optional().default([]),
  attack_path: cappedArray(
    z.object({
      step: text(120),
      detail: z.string().trim().max(400).optional().default(''),
      status: enumLoose(['observed', 'inferred'], { inference: 'inferred', possible: 'inferred', confirmed: 'observed' }),
    }),
    7,
  ),
  recommended_actions: cappedArray(
    z.object({
      priority: enumLoose(['immediate', 'soon', 'if_interacted'], {
        high: 'immediate',
        urgent: 'immediate',
        now: 'immediate',
        medium: 'soon',
        low: 'soon',
        recommended: 'soon',
        conditional: 'if_interacted',
        if_you_interacted: 'if_interacted',
      }),
      action: text(250),
      reason: text(400),
    }),
    10,
  ),
  missing_information: cappedArray(text(300), 6).optional().default([]),
  business_impact: z
    .object({
      processes_at_risk: cappedArray(text(120), 4).optional().default([]),
      verify_independently: cappedArray(text(300), 5).optional().default([]),
    })
    .optional(),
  limitations: cappedArray(text(300), 8),
  image: z
    .object({
      readability: enumLoose(['clear', 'partial', 'unreadable']),
      extracted_text: z.string().max(12000).transform((s) => s.trim()),
      visual_observations: cappedArray(text(300), 8).optional().default([]),
    })
    .optional(),
});

/** JSON Schema passed to Gemini `responseJsonSchema` to constrain generation. */
const str = { type: 'string' };
const conf = { type: 'number', minimum: 0, maximum: 1 };
export function buildResponseJsonSchema({ includeImage = false } = {}) {
  const schema = {
    type: 'object',
    properties: {
      classification: { type: 'string', enum: CLASSIFICATIONS },
      severity: { type: 'string', enum: SEVERITIES },
      confidence: conf,
      summary: str,
      observed_indicators: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: str,
            evidence: str,
            explanation: str,
            source: { type: 'string', enum: ['submitted_text', 'submitted_url', 'screenshot', 'security_checks'] },
            confidence: conf,
            indicates: { type: 'string', enum: ['risk', 'legitimacy'] },
          },
          required: ['name', 'evidence', 'explanation', 'source', 'confidence', 'indicates'],
        },
      },
      inferences: {
        type: 'array',
        items: {
          type: 'object',
          properties: { description: str, basis: str, confidence: conf },
          required: ['description', 'basis', 'confidence'],
        },
      },
      assumptions: { type: 'array', items: str },
      attack_path: {
        type: 'array',
        items: {
          type: 'object',
          properties: { step: str, detail: str, status: { type: 'string', enum: ['observed', 'inferred'] } },
          required: ['step', 'status'],
        },
      },
      recommended_actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            priority: { type: 'string', enum: ['immediate', 'soon', 'if_interacted'] },
            action: str,
            reason: str,
          },
          required: ['priority', 'action', 'reason'],
        },
      },
      missing_information: { type: 'array', items: str },
      limitations: { type: 'array', items: str },
      business_impact: {
        type: 'object',
        properties: {
          processes_at_risk: { type: 'array', items: str },
          verify_independently: { type: 'array', items: str },
        },
      },
    },
    required: [
      'classification', 'severity', 'confidence', 'summary', 'observed_indicators', 'inferences',
      'attack_path', 'recommended_actions', 'limitations',
    ],
  };
  if (includeImage) {
    schema.properties.image = {
      type: 'object',
      properties: {
        readability: { type: 'string', enum: ['clear', 'partial', 'unreadable'] },
        extracted_text: str,
        visual_observations: { type: 'array', items: str },
      },
      required: ['readability', 'extracted_text'],
    };
    schema.required.push('image');
  }
  return schema;
}
