export const VALID_AI = {
  classification: 'phishing',
  severity: 'high',
  confidence: 0.87,
  summary: 'Looks like phishing.',
  observed_indicators: [{ name: 'Urgency language', evidence: 'within 30 minutes', explanation: 'Pressure.', source: 'submitted_text', confidence: 0.9 }],
  inferences: [{ description: 'May lead to fake login.', basis: 'Link present.', confidence: 0.7 }],
  attack_path: [{ step: 'Message', status: 'observed' }],
  recommended_actions: [{ priority: 'immediate', action: 'Do not click.', reason: 'Unverified.' }],
  limitations: ['Link not visited.'],
};
