import { normalizeForMatch } from './evidenceEngine.js';

/**
 * Prioritised, defensive incident-response guidance. Zodon's baseline guidance is
 * deterministic; AI suggestions are merged in (deduplicated) and labelled.
 */

const rec = (priority, action, reason, scenario = 'general') => ({ priority, action, reason, scenario, source: 'zodon' });

export function buildRecommendations({ risk, items, ai, inputType, hasUrls = false }) {
  const observed = new Set(items.filter((i) => i.kind === 'observed' && i.polarity === 'risk').map((i) => i.category));
  const has = (...c) => c.some((x) => observed.has(x));
  const hasLink = inputType === 'url' || hasUrls || items.some((i) => i.url) || has('call_to_action', 'link_present');
  const out = [];

  if (risk.level === 'low') {
    out.push(rec('soon', 'No immediate action appears necessary.', 'Zodon did not find meaningful risk indicators. This does not guarantee the content is safe.'));
    out.push(rec('soon', 'If unsure, verify through an official channel you already trust.', 'Open the organisation\'s official app or type its known web address yourself instead of using links in the message.'));
  } else {
    if (hasLink) out.push(rec('immediate', 'Do not open the link.', 'The destination has not been verified as safe and was not visited by Zodon.', 'not_interacted'));
    if (has('attachment_risk')) out.push(rec('immediate', 'Do not open or enable content in any attachment.', 'Unexpected files can contain malicious code. Zodon did not scan any file.', 'not_interacted'));
    if (has('credential_request', 'financial_request')) out.push(rec('immediate', 'Do not reply with passwords, one-time codes, or card/bank details.', 'Legitimate organisations do not request these through messages.', 'not_interacted'));
    if (has('payment_demand')) out.push(rec('immediate', 'Do not make the requested payment.', 'Verify any outstanding charge directly with the organisation using contact details from its official website or your statements.', 'not_interacted'));
    if (has('payment_change_request')) out.push(rec('immediate', 'Do not pay to the new bank details until the change is confirmed.', 'Call the supplier or partner on a number already in your records—not one in this message—and confirm the change with a second person in your business.', 'not_interacted'));
    if (has('executive_impersonation')) out.push(rec('immediate', 'Confirm the request with the named person through a channel you already use.', 'Use their known phone number or speak in person, and follow your normal approval process even if the request says it is urgent or confidential.', 'not_interacted'));
    if (has('overpayment_scam')) out.push(rec('immediate', 'Do not refund anything until the original payment has cleared in your own account.', 'Check your banking app or statement directly; transfer receipts and SMS alerts can be faked.', 'not_interacted'));
    if (has('job_offer_lure')) out.push(rec('immediate', 'Do not pay any fee to secure a job, interview or training place.', 'Confirm the vacancy on the employer\'s official website or with its HR team through verified contact details.', 'not_interacted'));
    if (has('security_bypass')) out.push(rec('immediate', 'Do not install remote-access software or bypass normal approval steps.', 'Requests for secrecy or to skip checks are typical of social engineering.', 'not_interacted'));
    out.push(rec('immediate', 'Verify the claim independently.', 'Contact the organisation using a phone number or website you already know is genuine—not details from this message.', 'not_interacted'));
    out.push(rec('soon', 'Report and delete or block the message.', 'Use your email or messaging app\'s "report phishing/spam" feature, or your organisation\'s IT/security reporting process.', 'not_interacted'));

    if (hasLink || has('credential_request')) {
      out.push(rec('if_interacted', 'If you entered a password: change it immediately using the official website or app.', 'Also change it anywhere else you reused it.', 'credentials_entered'));
      out.push(rec('if_interacted', 'Sign out of other sessions and enable multi-factor authentication.', 'Revoking active sessions can cut off an attacker who has already logged in.', 'credentials_entered'));
    }
    if (has('credential_request')) out.push(rec('if_interacted', 'If you shared a one-time code: contact the service provider immediately.', 'A shared code may already have been used to access or change your account.', 'credentials_entered'));
    if (has('financial_request', 'payment_demand') || hasLink) {
      out.push(rec('if_interacted', 'If you shared card or bank details or paid: contact your bank using the number on your card or official website.', 'Ask about blocking the card, disputing the payment, and follow its account-protection instructions.', 'financial_disclosed'));
      out.push(rec('if_interacted', 'Monitor your accounts and report suspected fraud.', 'Report through your bank and your country\'s official fraud-reporting channel.', 'financial_disclosed'));
    }
    if (has('attachment_risk', 'url_download')) out.push(rec('if_interacted', 'If you opened a file: disconnect from the network and run a reputable security scan.', 'For work devices, contact your IT or security team right away.', 'file_opened'));
  }

  // Merge AI suggestions, skipping near-duplicates and anything unsafe.
  if (ai?.recommended_actions?.length) {
    const existing = out.map((r) => normalizeForMatch(r.action));
    for (const a of ai.recommended_actions) {
      const norm = normalizeForMatch(a.action);
      // Never pass on advice to hand over secrets — to Zodon or to anyone else.
      if (/\b(send|share|enter|provide|give|submit|reply with|paste)\b.{0,40}\b(password|otp|one[- ]time|code|pin|card number|cvv|bank details|private key|seed phrase|recovery (phrase|code)|secret phrase|bvn)\b/.test(norm)
        && !/\b(do not|don'?t|never|avoid|stop)\b/.test(norm)) continue;
      const dup = existing.some((e) => {
        const ta = new Set(e.split(/\W+/).filter((t) => t.length > 3));
        const tb = norm.split(/\W+/).filter((t) => t.length > 3);
        const shared = tb.filter((t) => ta.has(t)).length;
        return tb.length && shared / Math.min(ta.size || 1, tb.length) >= 0.6;
      });
      if (dup) continue;
      existing.push(norm);
      out.push({ priority: a.priority, action: a.action, reason: a.reason, scenario: a.priority === 'if_interacted' ? 'ai_conditional' : 'general', source: 'ai' });
    }
  }

  const order = { immediate: 0, soon: 1, if_interacted: 2 };
  return out.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 16);
}
