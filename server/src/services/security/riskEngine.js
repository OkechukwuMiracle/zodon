import { CATEGORIES, STRENGTH_WEIGHT, categoryLabel } from './taxonomy.js';

/**
 * Risk engine
 * -----------
 * Severity, AI confidence and evidence strength are computed and reported separately.
 *
 * 1. Evidence score: only OBSERVED risk items count. Within each category only the
 *    strongest item counts (strong=3, moderate=2, weak=1) so duplicates never stack.
 * 2. Group caps stop many weak signals of one kind inflating the score:
 *    pressure ≤ 4, identity ≤ 2, delivery ≤ 3, url ≤ 6.
 * 3. Combination bonus (+2): a strong request for credentials/money/secrecy together
 *    with a delivery mechanism (link, attachment) or identity claim — the core
 *    phishing pattern.
 * 4. Mitigation (−1): legitimate security-advisory wording, only if no strong signals.
 * 5. Evidence level: critical ≥ 11 with ≥2 strong categories and a strong request;
 *    high ≥ 7 with ≥1 strong; medium ≥ 4 or any strong; low > 0; none = 0.
 * 6. AI adjustment: the AI may raise the level by at most ONE step above the evidence
 *    level and never to critical unless evidence alone is ≥ high. It may lower the level
 *    by one step only when its confidence ≥ 0.7, and never below medium when there are
 *    ≥ 2 strong categories. Weak/no evidence + low-confidence AI → inconclusive.
 */

export const LEVELS = ['none', 'low', 'medium', 'high', 'critical'];
const rank = (l) => LEVELS.indexOf(l);

const GROUP_CAPS = { pressure: 4, identity: 2, delivery: 3, url: 6, business: 2 };
const REQUEST_CATS = new Set(['credential_request', 'financial_request', 'payment_demand', 'security_bypass', 'payment_change_request', 'overpayment_scam']);
const DELIVERY_CATS = new Set(['call_to_action', 'link_present', 'attachment_risk', 'contact_redirect']);

export function scoreEvidence(items, { hasUrls = false } = {}) {
  const observedRisk = items.filter((i) => i.kind === 'observed' && i.polarity === 'risk' && i.strength);
  const byCategory = new Map();
  for (const it of observedRisk) {
    const w = STRENGTH_WEIGHT[it.strength] ?? 0;
    const prev = byCategory.get(it.category);
    if (!prev || w > prev.weight) byCategory.set(it.category, { category: it.category, strength: it.strength, weight: w, title: it.title });
  }

  const groupTotals = {};
  const contributing = [];
  for (const entry of byCategory.values()) {
    const group = entry.category === 'reputation_flagged' ? 'reputation' : (CATEGORIES[entry.category]?.group ?? 'other');
    const cap = GROUP_CAPS[group];
    const used = groupTotals[group] ?? 0;
    const counted = cap === undefined ? entry.weight : Math.max(0, Math.min(entry.weight, cap - used));
    groupTotals[group] = used + counted;
    contributing.push({ ...entry, label: categoryLabel(entry.category), group, counted });
  }
  contributing.sort((a, b) => b.weight - a.weight);

  let score = contributing.reduce((s, c) => s + c.counted, 0);
  const strongCats = contributing.filter((c) => c.strength === 'strong');
  const strongRequest = strongCats.some((c) => REQUEST_CATS.has(c.category));
  const anyRequest = contributing.some((c) => REQUEST_CATS.has(c.category));
  const hasDelivery = hasUrls || contributing.some((c) => DELIVERY_CATS.has(c.category) || c.group === 'url');
  const hasIdentity = contributing.some((c) => c.group === 'identity' || c.group === 'business' || c.category === 'url_brand_mismatch' || c.category === 'url_lookalike');
  const notes = [];

  if (strongRequest && (hasDelivery || hasIdentity)) {
    score += 2;
    notes.push('Combination: a request for credentials, money or secrecy appears together with a link, attachment or identity claim (+2).');
  }
  const mitigated = items.some((i) => i.polarity === 'mitigating' && i.kind === 'observed');
  if (mitigated && strongCats.length === 0 && score > 0) {
    score -= 1;
    notes.push('Mitigation: the message contains legitimate security-advisory wording (−1).');
  }
  if (contributing.some((c) => c.category === 'reputation_flagged')) {
    notes.push('An external reputation service flagged a submitted URL.');
  }

  let level = 'none';
  if (score >= 11 && strongCats.length >= 2 && strongRequest) level = 'critical';
  else if (score >= 7 && strongCats.length >= 1) level = 'high';
  else if (score >= 4 || strongCats.length >= 1) level = 'medium';
  else if (score > 0) level = 'low';

  let strength = 'none';
  if (strongCats.length >= 2 || (strongCats.length >= 1 && score >= 7)) strength = 'strong';
  else if (score >= 4 || strongCats.length >= 1) strength = 'moderate';
  else if (score > 0) strength = 'weak';

  return { score, level, strength, contributing, strongCount: strongCats.length, anyRequest, strongRequest, hasDelivery, notes, mitigated };
}

/**
 * @param {object[]} items   correlated evidence
 * @param {object|null} ai   validated AI output (null when AI not used)
 * @param {{hasUrls?: boolean, imageReadability?: string}} ctx
 */
export function assessRisk(items, ai, { hasUrls = false, imageReadability = null } = {}) {
  const ev = scoreEvidence(items, { hasUrls });
  const rationale = [];
  rationale.push(
    ev.score === 0
      ? 'No observed risk indicators were found by the deterministic checks or verified in the AI output.'
      : `Evidence score ${ev.score} from ${ev.contributing.length} distinct indicator categories (${ev.strongCount} strong). Duplicate indicators within a category are counted once.`,
  );
  rationale.push(...ev.notes);
  const evidenceLevel = ev.level;
  let final;

  if (!ai) {
    if (rank(evidenceLevel) >= rank('medium')) {
      final = evidenceLevel;
      rationale.push(`Rule-based checks alone support a "${evidenceLevel}" level. No AI analysis was performed.`);
    } else {
      final = 'inconclusive';
      rationale.push('Without AI analysis, the absence of strong rule-based indicators does not show the content is safe, so the result is inconclusive.');
    }
  } else {
    const aiLevel = ai.severity;
    rationale.push(`Gemini assessed severity as "${aiLevel}" with ${(ai.confidence * 100).toFixed(0)}% confidence.`);
    if (aiLevel === 'inconclusive') {
      if (rank(evidenceLevel) >= rank('medium')) {
        final = evidenceLevel;
        rationale.push('The AI could not reach a conclusion, so the level is based on observed evidence only.');
      } else {
        final = 'inconclusive';
        rationale.push('The AI could not reach a conclusion and observed evidence is weak or absent.');
      }
    } else if (evidenceLevel === 'none' && aiLevel === 'low') {
      final = 'low';
      rationale.push('No risk indicators were observed, consistent with the AI\'s low rating.');
    } else if (rank(aiLevel) > rank(evidenceLevel)) {
      const ceiling = Math.max(rank(evidenceLevel), rank('low')) + 1;
      let capped = Math.min(rank(aiLevel), ceiling);
      if (capped === rank('critical') && rank(evidenceLevel) < rank('high')) capped = rank('high');
      final = LEVELS[capped];
      if (capped < rank(aiLevel)) {
        rationale.push(`The AI rated this higher than the observable evidence supports; the level was capped at "${final}" (at most one step above the evidence level "${evidenceLevel}").`);
      } else {
        rationale.push(`The AI assessment raised the level from the evidence-only level "${evidenceLevel}" to "${final}".`);
      }
    } else if (rank(aiLevel) < rank(evidenceLevel)) {
      if (ai.confidence >= 0.7) {
        let lowered = Math.max(rank(aiLevel), rank(evidenceLevel) - 1);
        if (ev.strongCount >= 2) lowered = Math.max(lowered, rank('medium'));
        final = LEVELS[lowered];
        rationale.push(`The AI rated this lower with high confidence; the level was reduced by at most one step to "${final}".`);
      } else {
        final = evidenceLevel;
        rationale.push('The AI rated this lower but with limited confidence, so the evidence-based level was kept.');
      }
    } else {
      final = aiLevel;
      rationale.push('The AI assessment agrees with the evidence-based level.');
    }

    if (final === 'low' && ev.score === 0 && ai.confidence < 0.5) {
      final = 'inconclusive';
      rationale.push('No risk indicators were observed, but AI confidence is low, so the result is inconclusive rather than low.');
    }
    if (final === 'none') final = ai.confidence >= 0.5 ? 'low' : 'inconclusive';
  }

  const allWeak = ev.contributing.length > 0 && ev.contributing.every((c) => c.strength === 'weak');
  if (allWeak && rank(final) > rank('medium')) {
    final = 'medium';
    rationale.push('All observed indicators are weak, so the level is capped at "medium" regardless of the AI rating.');
  }

  if (imageReadability === 'unreadable' && rank(final) < rank('high')) {
    final = 'inconclusive';
    rationale.push('The screenshot could not be read reliably, so no firm conclusion is possible.');
  }
  if (final === 'none') final = 'inconclusive';

  return {
    level: final,
    evidence_level: evidenceLevel,
    evidence_strength: ev.strength,
    score: ev.score,
    ai_severity: ai?.severity ?? null,
    ai_confidence: ai?.confidence ?? null,
    contributing: ev.contributing.map(({ category, label, strength, weight, counted }) => ({ category, label, strength, weight, counted })),
    rationale,
    disclaimer: 'This is a risk assessment based on the available evidence, not a confirmed security incident.',
    _signals: { anyRequest: ev.anyRequest, strongRequest: ev.strongRequest, hasDelivery: ev.hasDelivery, strongCount: ev.strongCount },
  };
}

/** Rules-only classification when no AI output is available. */
export function classifyFromEvidence(items, inputType) {
  const cats = new Set(items.filter((i) => i.kind === 'observed' && i.polarity === 'risk').map((i) => i.category));
  const has = (...c) => c.some((x) => cats.has(x));
  if (has('reputation_flagged')) return 'suspicious_url';
  if (has('credential_request') && has('call_to_action', 'link_present', 'url_brand_mismatch', 'url_lookalike', 'url_deceptive_structure', 'url_keyword')) return 'phishing';
  if (has('payment_change_request', 'executive_impersonation') || (has('invoice_lure') && has('payment_demand', 'security_bypass', 'overpayment_scam'))) return 'business_email_compromise';
  if (has('credential_request')) return 'credential_theft';
  if (has('financial_request', 'payment_demand', 'overpayment_scam', 'job_offer_lure')) return 'financial_scam';
  if (has('attachment_risk') && items.some((i) => i.category === 'attachment_risk' && i.strength !== 'weak')) return 'malware_delivery';
  if (has('url_lookalike', 'url_brand_mismatch')) return 'brand_impersonation';
  if (inputType === 'url' && [...cats].some((c) => c.startsWith('url_'))) return 'suspicious_url';
  if (has('security_bypass', 'verification_lure', 'threat_consequence', 'reward_lure', 'delivery_lure')) return 'social_engineering';
  return 'inconclusive';
}
