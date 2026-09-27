/** Plain-text rendering of a report for "Copy Report". */
export function reportToText(report) {
  const a = report.assessment;
  const pct = (v) => (typeof v === 'number' ? `${Math.round(v * 100)}%` : 'n/a');
  const lines = [];
  lines.push(`ZODON INVESTIGATION REPORT — ${report.id}`);
  lines.push(`Date: ${new Date(report.created_at).toISOString()}`);
  if (report.mode === 'sample') lines.push('*** SYNTHETIC SAMPLE — illustrative analysis, not a live AI result ***');
  if (report.mode === 'rules_only') lines.push('*** RULE-BASED CHECKS ONLY — live AI analysis was not performed ***');
  lines.push('');
  lines.push(`Classification: ${report.classification_label}`);
  lines.push(`Severity: ${a.severity.toUpperCase()}   Evidence strength: ${a.evidence_strength}   AI confidence: ${pct(a.ai_confidence)}`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push(report.summary);
  lines.push('');
  lines.push('WHY THIS SEVERITY');
  a.rationale.forEach((r) => lines.push(`- ${r}`));

  if (report.business_context?.applies) {
    lines.push('');
    lines.push('BUSINESS PROCESS AT RISK');
    for (const p of report.business_context.processes) {
      lines.push(`- ${p.process}${p.source === 'ai' ? ' (AI suggestion)' : ''}: ${p.why}`);
      p.verify.forEach((v) => lines.push(`    Verify: ${v}`));
    }
  }

  const groups = [
    ['OBSERVED EVIDENCE', 'observed'],
    ['AI INTERPRETATION', 'interpretation'],
    ['UNVERIFIED ASSUMPTIONS', 'assumption'],
  ];
  for (const [title, kind] of groups) {
    const items = report.evidence.filter((e) => e.kind === kind);
    if (!items.length) continue;
    lines.push('');
    lines.push(title);
    for (const e of items) {
      lines.push(`- ${e.title}${e.strength ? ` [${e.strength}]` : ''} (${e.source_label})`);
      if (e.evidence) lines.push(`    Evidence: "${e.evidence}"`);
      if (kind !== 'assumption') lines.push(`    ${e.explanation}`);
    }
  }

  lines.push('');
  lines.push('ATTACK PATH');
  if (report.attack_path.established) {
    report.attack_path.steps.forEach((s, i) => lines.push(`${i + 1}. [${s.status}] ${s.step}${s.detail ? ` — ${s.detail}` : ''}`));
  } else {
    lines.push(report.attack_path.message);
  }

  lines.push('');
  lines.push('RECOMMENDED ACTIONS');
  const pLabel = { immediate: 'Now', soon: 'Next', if_interacted: 'If you interacted' };
  report.recommendations.forEach((r) => lines.push(`- [${pLabel[r.priority] ?? r.priority}] ${r.action} — ${r.reason}`));

  lines.push('');
  lines.push('LIMITATIONS');
  report.limitations.forEach((l) => lines.push(`- ${l}`));
  if (report.processing?.statements?.length) {
    lines.push('');
    lines.push('HOW THIS SUBMISSION WAS PROCESSED');
    report.processing.statements.forEach((s) => lines.push(`- ${s}`));
  }
  lines.push('');
  lines.push(a.disclaimer);
  return lines.join('\n');
}

export function downloadJson(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
