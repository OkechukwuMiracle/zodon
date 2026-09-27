/**
 * SME business-process context. Maps observed indicators to the business process
 * that could be affected and to concrete things to verify independently.
 * Deterministic; AI-suggested items are merged in and labelled.
 */

const PROCESSES = [
  {
    id: 'accounts_payable',
    process: 'Supplier payments (accounts payable)',
    when: (c) => c.has('payment_change_request') || (c.has('invoice_lure') && c.has('payment_demand', 'urgency', 'security_bypass')),
    why: 'The message tries to change where or how a supplier is paid. If acted on, a legitimate invoice could be paid into an account the supplier does not control.',
    verify: [
      'Call the supplier on a phone number already in your records (not one in this message) and confirm any change of bank details.',
      'Check that the invoice number, amount and items match a real purchase order or delivery.',
      'Require a second person to approve any change of payee details before the next payment.',
    ],
  },
  {
    id: 'executive_approval',
    process: 'Payment approvals and executive requests',
    when: (c) => c.has('executive_impersonation') || (c.business && c.has('security_bypass') && c.has('payment_demand', 'payment_change_request')),
    why: 'The request bypasses normal approval steps or uses a manager\'s authority to create urgency.',
    verify: [
      'Confirm the request with the named person in person or on their known phone number.',
      'Follow your normal written approval process, even if the request says it is urgent or confidential.',
    ],
  },
  {
    id: 'receivables',
    process: 'Customer payments and refunds (accounts receivable)',
    when: (c) => c.has('overpayment_scam'),
    why: 'The message asks the business to refund money. The original payment may be fake, reversed or not yet cleared.',
    verify: [
      'Confirm in your own banking app or statement that the funds have actually cleared—do not rely on screenshots or SMS alerts.',
      'Refund only to the original payment method, after the funds have cleared.',
    ],
  },
  {
    id: 'credentials',
    process: 'Staff accounts and business systems',
    when: (c) => c.has('credential_request') && c.business,
    why: 'Shared credentials or codes could give access to business email, banking or payment systems.',
    verify: ['Check any sign-in request through the service\'s official app or website, not the link in the message.'],
  },
];

const BUSINESS_CATS = ['payment_change_request', 'invoice_lure', 'executive_impersonation', 'overpayment_scam'];
const ELEVATED = new Set(['medium', 'high', 'critical']);

function tokens(s) {
  return new Set(s.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 3));
}
function similar(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared > 0 && shared / Math.min(ta.size || 1, tb.size || 1) >= 0.5;
}

/**
 * @param {{items: object[], ai: object|null, severity?: string}} p
 * AI-suggested processes are only included when the final severity is medium or above, so
 * legitimate messages are never described as putting a business process "at risk".
 */
export function buildBusinessContext({ items, ai, severity = 'inconclusive' }) {
  const observed = new Set(items.filter((i) => i.kind === 'observed' && i.polarity === 'risk').map((i) => i.category));
  const has = (...c) => c.some((x) => observed.has(x));
  const business = has(...BUSINESS_CATS) || ai?.classification === 'business_email_compromise';
  const ctx = { has, business };

  const processes = PROCESSES.filter((p) => p.when(ctx)).map(({ id, process, why, verify }) => ({ id, process, why, verify, source: 'zodon' }));

  // AI suggestions are accepted only with a business signal and an elevated severity.
  const aiImpact = business && ELEVATED.has(severity) ? ai?.business_impact : null;
  for (const p of aiImpact?.processes_at_risk ?? []) {
    if (processes.some((x) => similar(x.process, p))) continue;
    processes.push({ id: `ai:${processes.length}`, process: p, why: 'Identified by the AI analysis; not independently verified.', verify: [], source: 'ai' });
  }
  const zodonChecks = processes.flatMap((p) => p.verify);
  const aiVerify = (aiImpact?.verify_independently ?? []).filter((v) => v && !zodonChecks.some((z) => similar(z, v)));

  return {
    applies: processes.length > 0,
    processes,
    ai_verify: aiVerify,
    note: 'Zodon cannot see your records or contact your partners. Verify through channels you already trust, and keep payment decisions with the people authorised to make them.',
  };
}
