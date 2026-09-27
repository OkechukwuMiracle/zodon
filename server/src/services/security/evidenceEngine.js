import { categorizeName, categoryLabel } from './taxonomy.js';

/**
 * Evidence correlation. Merges deterministic rule hits, URL findings, reputation
 * results and AI output into one deduplicated list, and labels each item as:
 *   observed        – directly present in the submission or produced by a deterministic check
 *   interpretation  – an AI inference, or AI-reported evidence Zodon could not locate in the submission
 *   assumption      – something taken for granted that has not been verified
 */

const SOURCE_LABELS = {
  submitted_text: 'Submitted text (rule check)',
  screenshot_text: 'Screenshot text as transcribed by AI (rule check)',
  url_structure: 'URL structure analysis',
  reputation: 'Reputation service',
  ai: 'Gemini AI analysis',
  ai_vision: 'Gemini AI analysis of screenshot',
  zodon: 'Zodon',
};

// Default strength when an AI indicator maps onto a category.
const CATEGORY_DEFAULT_STRENGTH = {
  credential_request: 'strong',
  financial_request: 'strong',
  security_bypass: 'strong',
  payment_change_request: 'strong',
  overpayment_scam: 'moderate',
  invoice_lure: 'moderate',
  executive_impersonation: 'moderate',
  job_offer_lure: 'moderate',
  payment_demand: 'moderate',
  attachment_risk: 'moderate',
  urgency: 'moderate',
  threat_consequence: 'moderate',
  reward_lure: 'moderate',
  delivery_lure: 'moderate',
  verification_lure: 'moderate',
  call_to_action: 'moderate',
  impersonation: 'moderate',
  url_lookalike: 'moderate',
  url_brand_mismatch: 'moderate',
  url_deceptive_structure: 'moderate',
  url_ip_host: 'moderate',
  url_punycode: 'moderate',
  url_shortener: 'moderate',
  brand_reference: 'weak',
  link_present: 'weak',
  ai_other: 'weak',
};
const DOWNGRADE = { strong: 'moderate', moderate: 'weak', weak: 'weak' };
// Categories too generic to merge on category alone; require overlapping evidence.
const NO_CATEGORY_MERGE = new Set(['ai_other', 'link_present', 'brand_reference']);

export function normalizeForMatch(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[“”"'‘’`]/g, '')
    .replace(/…|\.{3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Is `excerpt` present in `corpus`? Tolerates ellipses by requiring every fragment to be present. */
export function excerptInCorpus(excerpt, corpus) {
  const c = normalizeForMatch(corpus);
  const raw = String(excerpt ?? '');
  const fragments = raw
    .split(/…|\.{3}|\[\.\.\.\]/)
    .map(normalizeForMatch)
    .filter((f) => f.length >= 4);
  if (!fragments.length) return false;
  return fragments.every((f) => c.includes(f));
}

function tokenOverlap(a, b) {
  const ta = new Set(normalizeForMatch(a).split(/\W+/).filter((t) => t.length > 2));
  const tb = new Set(normalizeForMatch(b).split(/\W+/).filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

function fromRule(ind, { imageMode }) {
  const source = imageMode && ind.source === 'submitted_text' ? 'screenshot_text' : ind.source;
  return {
    id: ind.id,
    title: ind.name,
    evidence: ind.evidence,
    match: ind.match ?? null, // exact matched phrase inside the excerpt (highlighted in the UI)
    evidence_type: ind.source === 'url_structure' ? 'url_component' : 'text',
    explanation: ind.explanation,
    category: ind.category,
    category_label: categoryLabel(ind.category),
    strength: ind.strength,
    confidence: null,
    kind: 'observed',
    polarity: ind.polarity ?? 'risk',
    sources: [source],
    source_label: SOURCE_LABELS[source] ?? source,
    method: 'rule',
    corroborated: false,
    ai_note: null,
  };
}

/**
 * @param {object} p
 * @param {object[]} p.textIndicators    rule hits (risk)
 * @param {object[]} p.mitigating        rule hits (mitigating)
 * @param {object[]} p.urlAnalyses       urlAnalyzer results
 * @param {object}   p.reputation        reputation service result
 * @param {object|null} p.ai             validated AI output
 * @param {string}   p.corpus            text used to verify AI excerpts (submission, URL, or AI transcription)
 * @param {string}   p.checksCorpus      text of deterministic findings (for AI source "security_checks")
 * @param {'text'|'url'|'image'} p.inputType
 */
export function correlateEvidence({
  textIndicators = [],
  mitigating = [],
  urlAnalyses = [],
  reputation = null,
  ai = null,
  corpus = '',
  checksCorpus = '',
  inputType = 'text',
  stats = null, // optional { ai_citations, ai_verified } counter, filled in place
}) {
  const imageMode = inputType === 'image';
  const items = [];
  const seen = new Set();

  const pushUnique = (item, key) => {
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const ind of textIndicators) pushUnique(fromRule(ind, { imageMode }), `rule:${ind.id}`);

  for (const analysis of urlAnalyses) {
    if (!analysis.valid) continue;
    for (const f of analysis.findings) {
      const item = fromRule(f, { imageMode });
      item.url = analysis.input;
      pushUnique(item, `${f.id}:${analysis.hostname}`);
    }
  }

  if (reputation?.checked) {
    for (const m of reputation.matches) {
      pushUnique(
        {
          id: `reputation:${m.url}`,
          title: `Listed by ${reputation.provider} (${m.threat_type})`,
          evidence: m.url,
          explanation: `${reputation.provider} reports this URL as ${String(m.threat_type).toLowerCase().replace(/_/g, ' ')}. This is an external reputation result, retrieved without visiting the site.`,
          category: 'reputation_flagged',
          category_label: categoryLabel('reputation_flagged'),
          strength: 'strong',
          confidence: null,
          kind: 'observed',
          polarity: 'risk',
          sources: ['reputation'],
          source_label: `${SOURCE_LABELS.reputation}: ${reputation.provider}`,
          method: 'reputation',
          corroborated: false,
          ai_note: null,
        },
        `reputation:${m.url}`,
      );
    }
  }

  for (const ind of mitigating) pushUnique(fromRule(ind, { imageMode }), `rule:${ind.id}`);

  if (ai) {
    for (const ai_ind of ai.observed_indicators) {
      if (ai_ind.indicates === 'legitimacy') {
        const verified = excerptInCorpus(ai_ind.evidence, corpus) || excerptInCorpus(ai_ind.evidence, checksCorpus);
        if (stats) { stats.ai_citations++; if (verified) stats.ai_verified++; }
        const aiSource = imageMode ? 'ai_vision' : 'ai';
        items.push({
          id: `ai:legit:${items.length}`,
          title: ai_ind.name,
          evidence: ai_ind.evidence,
          explanation: verified ? ai_ind.explanation : `${ai_ind.explanation} (Excerpt not found verbatim in the submission.)`,
          category: 'security_advisory',
          category_label: categoryLabel('security_advisory'),
          strength: 'weak',
          confidence: ai_ind.confidence,
          kind: verified ? 'observed' : 'interpretation',
          polarity: 'mitigating',
          sources: [aiSource],
          source_label: SOURCE_LABELS[aiSource],
          method: 'ai',
          corroborated: false,
          ai_note: null,
          verified_in_submission: verified,
        });
        continue;
      }
      const category = categorizeName(ai_ind.name);
      const isVisual = imageMode && /^\s*visual\s*:/i.test(ai_ind.evidence);
      const visualObs = (ai.image?.visual_observations ?? []).join('\n');
      // Visual details cannot be checked against text; require consistency with the AI's own
      // visual observations, and label them as AI-described.
      const verified = isVisual
        ? tokenOverlap(ai_ind.evidence.replace(/^\s*visual\s*:/i, ''), visualObs) >= 0.5
        : ai_ind.source === 'security_checks'
          ? excerptInCorpus(ai_ind.evidence, checksCorpus) || excerptInCorpus(ai_ind.evidence, corpus)
          : excerptInCorpus(ai_ind.evidence, corpus);

      // Try to merge into an existing observed item (dedupe/corroborate).
      // Prefer a same-category match; fall back to substantial excerpt overlap.
      const candidates = items.filter((it) => it.kind === 'observed' && it.polarity === 'risk');
      const longEnough = normalizeForMatch(ai_ind.evidence).split(/\W+/).filter((t) => t.length > 2).length >= 3;
      const match =
        (!NO_CATEGORY_MERGE.has(category) && candidates.find((it) => it.category === category)) ||
        (verified && longEnough && candidates.find((it) => tokenOverlap(it.evidence, ai_ind.evidence) >= 0.6)) ||
        null;
      if (stats) { stats.ai_citations++; if (verified) stats.ai_verified++; }
      if (match && verified && !isVisual) {
        if (!match.sources.includes('ai')) match.sources.push(imageMode ? 'ai_vision' : 'ai');
        match.corroborated = match.method !== 'ai';
        match.confidence = Math.max(match.confidence ?? 0, ai_ind.confidence);
        match.ai_note = match.ai_note ?? ai_ind.explanation;
        match.source_label = match.sources.map((s) => SOURCE_LABELS[s] ?? s).join(' + ');
        continue;
      }

      const base = CATEGORY_DEFAULT_STRENGTH[category] ?? 'weak';
      let strength = ai_ind.confidence >= 0.75 ? base : DOWNGRADE[base];
      if (isVisual) strength = DOWNGRADE[strength];
      const aiSource = imageMode ? 'ai_vision' : 'ai';
      let explanation = ai_ind.explanation;
      if (isVisual) {
        explanation += verified
          ? ' (Visual detail described by the AI. Zodon cannot independently verify image content, so this counts as a weaker signal.)'
          : ' (Visual detail described by the AI but not consistent with its own image observations; treated as an interpretation.)';
      } else if (!verified) {
        explanation += ` (Zodon could not find this excerpt verbatim in the ${imageMode ? 'transcribed screenshot text' : 'submission'}, so it is treated as an AI interpretation, not observed evidence.)`;
      }
      items.push({
        id: `ai:${items.length}`,
        title: ai_ind.name,
        evidence: ai_ind.evidence,
        match: null,
        evidence_type: isVisual ? 'visual' : ai_ind.source === 'submitted_url' ? 'url_component' : 'text',
        explanation,
        category,
        category_label: categoryLabel(category),
        strength: verified ? strength : 'weak',
        confidence: ai_ind.confidence,
        kind: verified ? 'observed' : 'interpretation',
        polarity: 'risk',
        sources: [aiSource],
        source_label: SOURCE_LABELS[aiSource],
        method: 'ai',
        corroborated: false,
        ai_note: null,
        verified_in_submission: verified,
      });
    }

    ai.inferences.forEach((inf, i) =>
      items.push({
        id: `ai:inference:${i}`,
        title: inf.description,
        evidence: inf.basis,
        explanation: 'AI interpretation based on the evidence above. Not independently verified.',
        category: 'ai_inference',
        category_label: 'AI interpretation',
        strength: null,
        confidence: inf.confidence,
        kind: 'interpretation',
        polarity: 'neutral',
        sources: [imageMode ? 'ai_vision' : 'ai'],
        source_label: SOURCE_LABELS[imageMode ? 'ai_vision' : 'ai'],
        method: 'ai',
        corroborated: false,
        ai_note: null,
      }),
    );

    (ai.assumptions ?? []).forEach((a, i) =>
      items.push(assumption(`ai:assumption:${i}`, a, imageMode ? 'ai_vision' : 'ai')),
    );
  }

  // Deterministic assumptions that always apply when relevant.
  const cats = new Set(items.filter((i) => i.kind === 'observed').map((i) => i.category));
  if (cats.has('brand_reference') || cats.has('impersonation') || cats.has('url_brand_mismatch') || cats.has('url_lookalike')) {
    items.push(assumption('zodon:sender', 'The sender\'s identity has not been verified. Zodon cannot confirm who actually sent this content.', 'zodon'));
  }
  if (urlAnalyses.some((u) => u.valid)) {
    items.push(assumption('zodon:destination', 'The link destination was not visited. What the page does (e.g., whether it requests a login) is unknown.', 'zodon'));
  }

  return items;
}

function assumption(id, text, source) {
  return {
    id,
    title: text,
    evidence: null,
    explanation: 'Unverified assumption — treat with caution.',
    category: 'assumption',
    category_label: 'Unverified assumption',
    strength: null,
    confidence: null,
    kind: 'assumption',
    polarity: 'neutral',
    sources: [source],
    source_label: SOURCE_LABELS[source] ?? source,
    method: source === 'zodon' ? 'rule' : 'ai',
    corroborated: false,
    ai_note: null,
  };
}
