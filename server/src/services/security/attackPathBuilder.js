/**
 * Builds an evidence-supported attack path. Observed steps come only from
 * deterministic/verified observed evidence. Inferred steps come from the AI
 * (forced to status "inferred") or, without AI, from fixed templates.
 * If the evidence does not support an attack, no path is produced.
 */

export const NO_PATH_MESSAGE = 'Not enough evidence to establish a likely attack path.';

const INFERRED_TEMPLATES = [
  { when: (c) => c.has('payment_change_request'), steps: ['Payment sent to the new, unverified account', 'Funds may be diverted to an account the real supplier does not control', 'Possible financial loss that is hard to recover'] },
  { when: (c) => c.has('executive_impersonation'), steps: ['Staff member acts on the request without normal verification', 'Possible unauthorised payment or gift-card purchase'] },
  { when: (c) => c.has('overpayment_scam'), steps: ['Business refunds the "overpaid" amount', 'Original payment may be reversed or never clear', 'Possible loss of the refunded amount'] },
  { when: (c) => c.has('job_offer_lure'), steps: ['Applicant pays the requested fee', 'Possible loss of money and personal information with no real job'] },
  { when: (c) => c.has('credential_request') && c.hasLink, steps: ['Possible fake sign-in or verification page at the link destination', 'Potential credential or one-time-code theft', 'Possible account takeover'] },
  { when: (c) => c.has('credential_request'), steps: ['Recipient may disclose a password or one-time code', 'Possible account takeover'] },
  { when: (c) => c.has('financial_request') || (c.has('payment_demand') && c.hasLink), steps: ['Possible fraudulent payment or card-entry page', 'Potential theft of card or banking details', 'Possible financial loss'] },
  { when: (c) => c.has('payment_demand'), steps: ['Recipient may send money through the requested method', 'Possible financial loss that is hard to reverse'] },
  { when: (c) => c.has('attachment_risk') || c.has('url_download'), steps: ['Recipient may open or run the file', 'Possible malware execution (not verified—no file was scanned)'] },
  { when: (c) => c.has('security_bypass'), steps: ['Recipient may bypass normal checks or grant remote access', 'Possible unauthorised access or fraud'] },
  { when: (c) => c.hasLink && (c.has('url_lookalike') || c.has('url_brand_mismatch') || c.has('url_deceptive_structure') || c.has('reputation_flagged')), steps: ['Possible impersonation website at the link destination', 'Potential collection of personal or login information'] },
];

export function buildAttackPath({ items, risk, ai, inputType, urlAnalyses = [] }) {
  const observed = items.filter((i) => i.kind === 'observed' && i.polarity === 'risk');
  const cats = new Set(observed.map((i) => i.category));
  const has = (c) => cats.has(c);
  const hosts = urlAnalyses.filter((u) => u.valid).map((u) => u.registrable_domain || u.hostname);
  const hasLink = hosts.length > 0;
  const ctx = { has, hasLink };

  if (['low', 'inconclusive'].includes(risk.level) || risk.evidence_strength === 'none' || risk.evidence_strength === 'weak') {
    return { established: false, steps: [], message: NO_PATH_MESSAGE };
  }

  const steps = [];
  const add = (step, detail, status) => steps.push({ step, detail, status });

  // 1. Initial contact
  if (inputType === 'url') add('Suspicious link submitted', hosts[0] ? `Link to ${hosts[0]}` : 'URL provided for analysis', 'observed');
  else add(inputType === 'image' ? 'Suspicious message (screenshot)' : 'Suspicious message received', 'Content submitted for investigation', 'observed');

  // 2. Lure / pretext
  if (has('url_lookalike') || has('url_brand_mismatch') || has('impersonation')) {
    add('Impersonation attempt', 'Uses a trusted name or lookalike address to appear legitimate', 'observed');
  }
  const deceptive = ['url_deceptive_structure', 'url_ip_host', 'url_punycode', 'url_shortener', 'url_obfuscation'].filter(has);
  if (deceptive.length) {
    add('Deceptive or concealed link address', 'The URL structure hides or disguises the real destination', 'observed');
  }
  if (has('reputation_flagged')) add('Link flagged by reputation service', 'External reputation result', 'observed');
  if (has('executive_impersonation')) add('Request sent outside normal channels', 'Pattern typical of executive or manager impersonation', 'observed');
  const pressure = ['urgency', 'threat_consequence', 'delivery_lure', 'reward_lure', 'verification_lure', 'invoice_lure', 'job_offer_lure'].filter(has);
  if (pressure.length) {
    const labels = { urgency: 'urgency', threat_consequence: 'threat of consequences', delivery_lure: 'delivery problem', reward_lure: 'prize or refund', verification_lure: 'account verification', invoice_lure: 'invoice or payment release', job_offer_lure: 'job offer' };
    add('Pressure or pretext applied', `Pretext: ${pressure.map((p) => labels[p]).join(', ')}`, 'observed');
  }

  // 3. Requested action (observed)
  if (hasLink && inputType !== 'url') add('Recipient directed to a link', `Link to ${hosts.slice(0, 2).join(', ')}`, 'observed');
  if (has('credential_request')) add('Password or code requested', 'The message asks for secret credentials or a one-time code', 'observed');
  if (has('financial_request')) add('Financial details requested', 'The message asks for card or banking information', 'observed');
  if (has('payment_change_request')) add('New bank or payment details supplied', 'Payments are redirected to a different account', 'observed');
  if (has('overpayment_scam')) add('Refund of an "overpayment" requested', 'The recipient is asked to send money back', 'observed');
  if (has('payment_demand')) add('Payment requested', 'The message asks the recipient to pay', 'observed');
  if (has('attachment_risk')) add('Attachment or file referenced', 'The recipient is directed to a file', 'observed');
  if (has('security_bypass')) add('Request to bypass security or keep secret', 'Normal verification is discouraged', 'observed');

  // 4. Inferred continuation
  let inferred = [];
  if (ai?.attack_path?.length) {
    inferred = ai.attack_path
      .filter((s) => s.status === 'inferred')
      .map((s) => ({ step: s.step, detail: s.detail || '', status: 'inferred' }));
  }
  if (!inferred.length) {
    const template = INFERRED_TEMPLATES.find((t) => t.when(ctx));
    if (template) inferred = template.steps.map((s) => ({ step: s, detail: '', status: 'inferred' }));
  }
  steps.push(...inferred.slice(0, 4));

  const observedActions = steps.filter((s) => s.status === 'observed').length;
  if (observedActions < 2 || !inferred.length) {
    return { established: false, steps: [], message: NO_PATH_MESSAGE };
  }
  return {
    established: true,
    steps,
    message: 'Observed steps are visible in the submission. Inferred steps describe what could plausibly happen next and have not been confirmed.',
  };
}
