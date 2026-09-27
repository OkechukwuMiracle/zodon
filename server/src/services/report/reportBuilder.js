import { classifyFromEvidence } from '../security/riskEngine.js';

export const CLASSIFICATION_LABELS = {
  phishing: 'Phishing',
  social_engineering: 'Social engineering',
  brand_impersonation: 'Brand impersonation',
  credential_theft: 'Credential theft attempt',
  financial_scam: 'Financial scam',
  malware_delivery: 'Malware delivery indicators',
  suspicious_url: 'Suspicious URL',
  business_email_compromise: 'Business email compromise / invoice fraud',
  spam: 'Spam',
  benign: 'Benign / legitimate-looking',
  inconclusive: 'Inconclusive',
};

const BASE_LIMITATIONS = [
  'Zodon did not visit any link, open any attachment, or contact the sender.',
  'The identity of the sender has not been verified.',
  'This is an assessment of risk based on the available evidence, not a confirmed security incident, and it does not guarantee safety.',
];

function dedupeStrings(list) {
  const seen = new Set();
  return list.filter((s) => {
    const k = s.toLowerCase().replace(/\W+/g, ' ').trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function rulesOnlySummary(risk, evidence, inputType) {
  const observed = evidence.filter((e) => e.kind === 'observed' && e.polarity === 'risk');
  const subject = { text: 'message', url: 'URL', image: 'screenshot' }[inputType];
  if (!observed.length) {
    return `Rule-based checks found no risk indicators in this ${subject}. Live AI analysis was not performed, so this is not a complete investigation and the result is inconclusive.`;
  }
  const top = [...new Set(observed.map((e) => e.category_label))].slice(0, 4).join(', ').toLowerCase();
  return `Rule-based checks found ${observed.length} indicator${observed.length === 1 ? '' : 's'} in this ${subject} (${top}). Live AI analysis was not performed, so this is a partial, rule-only assessment.`;
}

/** Plain-language disclosure of who processed the submission, shown on every report. */
function describeProcessing({ mode, aiInfo, inputType, reputation }) {
  const what = { text: 'message text', url: 'URL', image: 'screenshot' }[inputType];
  const statements = [];
  if (mode === 'live') {
    statements.push(`The ${what} was sent to ${aiInfo.provider} (${aiInfo.model}) for analysis. Zodon does not store it on its server.`);
  } else if (mode === 'rules_only') {
    statements.push(`The ${what} was checked by Zodon's rule engine only. It was not analysed by an external AI provider.`);
  } else {
    statements.push('Synthetic sample: no user content was sent to an external AI provider.');
  }
  if (reputation?.checked) {
    statements.push(`URL strings were sent to ${reputation.provider} for a reputation lookup (the sites were not visited).`);
  }
  statements.push('Zodon only gives guidance. It does not contact anyone, block anything or act on your accounts; decisions stay with you.');
  return { external_ai: mode === 'live', provider: mode === 'live' ? aiInfo.provider : null, stored_by_zodon: false, statements };
}

/**
 * Assemble the final investigation report object returned to the client.
 */
export function buildReport({
  id,
  createdAt,
  mode,
  inputType,
  aiInfo,
  ai,
  risk,
  evidence,
  attackPath,
  recommendations,
  businessContext = null,
  citationCheck = null,
  urlAnalyses,
  reputation,
  extracted,
  submission,
  sample = null,
}) {
  const classification = ai ? ai.classification : classifyFromEvidence(evidence, inputType);
  const notices = [];
  if (mode === 'sample') {
    notices.push('SYNTHETIC SAMPLE: this investigation uses fictional content and a pre-written illustrative analysis. It is not a live Gemini result.');
  }
  if (mode === 'rules_only') {
    notices.push('Live AI analysis was unavailable. Only deterministic rule-based checks are shown — this is not a complete AI investigation.');
  }
  if (risk.ai_severity && risk.ai_severity !== risk.level) {
    notices.push(`Zodon's final severity ("${risk.level}") differs from the AI's own rating ("${risk.ai_severity}") because it is calibrated against observed evidence.`);
  }

  const limitations = dedupeStrings([
    ...BASE_LIMITATIONS,
    ...(reputation?.checked ? [`URL reputation was checked with ${reputation.provider}. A lack of matches does not mean a URL is safe.`] : urlAnalyses.length ? ['No URL reputation service was consulted; URL findings are structural only.'] : []),
    ...(inputType === 'image' ? ['Screenshot text was transcribed by AI and may contain transcription errors.'] : []),
    ...(ai?.limitations ?? []),
  ]).slice(0, 12);

  const { _signals, ...assessment } = risk;
  void _signals;

  return {
    schema_version: 1,
    id,
    created_at: createdAt,
    mode,
    input_type: inputType,
    ai: aiInfo,
    classification,
    classification_label: CLASSIFICATION_LABELS[classification] ?? classification,
    summary: ai ? ai.summary : rulesOnlySummary(risk, evidence, inputType),
    assessment: { severity: assessment.level, ...assessment },
    evidence,
    attack_path: attackPath,
    recommendations,
    business_context: businessContext ?? { applies: false, processes: [], ai_verify: [], note: null },
    citation_check: citationCheck,
    processing: describeProcessing({ mode, aiInfo, inputType, reputation }),
    limitations,
    missing_information: ai?.missing_information ?? [],
    url_analysis: urlAnalyses,
    reputation: reputation ?? { checked: false, provider: null, matches: [] },
    extracted,
    image: ai?.image
      ? { readability: ai.image.readability, visual_observations: ai.image.visual_observations ?? [], extracted_text: ai.image.extracted_text }
      : null,
    submission,
    sample,
    notices,
  };
}
