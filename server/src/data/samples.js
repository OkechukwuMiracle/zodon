/**
 * SYNTHETIC SAMPLE CASES — all organisations, people, domains and numbers are fictional.
 * "Northbridge Federal" and "SwiftParcel" are invented names used only for demonstration.
 *
 * `illustrativeAnalysis` is a hand-written example of the AI output format. It is used
 * only by POST /api/analyze/sample and is always labelled as synthetic — it is never
 * presented as a live Gemini result. Users can instead load the sample content into
 * the input form and run a real analysis.
 */
export const SAMPLES = [
  {
    id: 'bank-phishing',
    title: 'Bank account suspension (phishing)',
    description: 'SMS impersonating a fictional bank that asks for a one-time code.',
    input_type: 'text',
    expected: 'High or critical — phishing',
    content:
      "NORTHBRIDGE FEDERAL ALERT: Your online banking access has been suspended due to unusual sign-in activity. Verify your identity within 30 minutes to avoid permanent closure: http://login.northbridgefederal.com.account-verify-center.co/secure/update?ref=sms\nReply with the 6-digit code we just sent you to confirm it's you.",
    illustrativeAnalysis: {
      classification: 'phishing',
      severity: 'critical',
      confidence: 0.9,
      summary:
        'This message appears to impersonate a bank ("Northbridge Federal") and uses a threat of account closure plus a 30-minute deadline to push the recipient to a link whose real domain is account-verify-center.co, not the bank\'s. It also asks the recipient to reply with a one-time code, which could let an attacker take over the account.',
      observed_indicators: [
        { name: 'Request to share a one-time code', evidence: 'Reply with the 6-digit code we just sent you', explanation: 'Banks do not ask customers to send one-time codes by message; the code could be used to complete a login or payment.', source: 'submitted_text', confidence: 0.95 },
        { name: 'Urgency and threat of closure', evidence: 'Verify your identity within 30 minutes to avoid permanent closure', explanation: 'A short deadline and threat of closure pressure the recipient to act without checking.', source: 'submitted_text', confidence: 0.9 },
        { name: 'Bank name placed before an unrelated domain', evidence: 'login.northbridgefederal.com.account-verify-center.co', explanation: 'The bank-like name is only a subdomain; the link is controlled by account-verify-center.co.', source: 'submitted_url', confidence: 0.9 },
      ],
      inferences: [
        { description: 'The link likely leads to a page imitating the bank\'s sign-in page.', basis: 'The path "/secure/update" and the verification wording suggest a credential-collection page, but the page was not visited.', confidence: 0.75 },
        { description: 'The sender may be attempting real-time account takeover.', basis: 'Asking for a just-sent code is consistent with an attacker triggering a login and needing the code to complete it.', confidence: 0.7 },
      ],
      assumptions: ['Assumes the recipient has an account with a bank of this name.'],
      attack_path: [
        { step: 'Suspicious SMS received', detail: '', status: 'observed' },
        { step: 'Victim enters login details on an imitation bank page', detail: 'Destination not verified', status: 'inferred' },
        { step: 'Attacker triggers a real login and requests the one-time code', detail: '', status: 'inferred' },
        { step: 'Possible account takeover and fraudulent transfers', detail: '', status: 'inferred' },
      ],
      recommended_actions: [
        { priority: 'immediate', action: 'Do not reply with any code.', reason: 'A one-time code can let someone else complete a login or payment.' },
        { priority: 'soon', action: 'Forward the message to your mobile carrier\'s spam-reporting number if available.', reason: 'Reporting helps block the sender for others.' },
      ],
      missing_information: ['The sender\'s phone number or short code.', 'Whether the recipient actually banks with this institution.'],
      limitations: ['The link destination was not visited or verified.'],
    },
  },
  {
    id: 'delivery-fee',
    title: 'Parcel redelivery fee',
    description: 'Fictional courier notice asking for a small payment.',
    input_type: 'text',
    expected: 'Medium or high — financial scam',
    content:
      'SwiftParcel: Your parcel SP-40921 is on hold due to an unpaid redelivery fee of $1.99. Pay within 24 hours to avoid return to sender: https://swiftparcel-redelivery.top/pay',
    illustrativeAnalysis: {
      classification: 'financial_scam',
      severity: 'high',
      confidence: 0.82,
      summary:
        'This message follows a common fake-delivery pattern: a small unpaid fee, a 24-hour deadline, and a payment link. Small fees are typically used to collect full card details on a payment page.',
      observed_indicators: [
        { name: 'Small unexpected fee', evidence: 'unpaid redelivery fee of $1.99', explanation: 'Low amounts make victims less cautious while still requiring card details.', source: 'submitted_text', confidence: 0.85 },
        { name: 'Deadline pressure', evidence: 'Pay within 24 hours to avoid return to sender', explanation: 'Creates urgency to pay before verifying.', source: 'submitted_text', confidence: 0.85 },
        { name: 'Payment link', evidence: 'https://swiftparcel-redelivery.top/pay', explanation: 'The recipient is sent to a payment page on a domain that could not be verified as the courier\'s.', source: 'submitted_url', confidence: 0.7 },
      ],
      inferences: [
        { description: 'The payment page may collect card number, expiry date and security code.', basis: 'The link path is "/pay" and the message asks for payment.', confidence: 0.7 },
      ],
      assumptions: ['Assumes the recipient is not expecting a genuine charge from this courier.'],
      attack_path: [
        { step: 'Fake delivery SMS received', detail: '', status: 'observed' },
        { step: 'Victim enters card details to pay the fee', detail: '', status: 'inferred' },
        { step: 'Card details reused for fraudulent purchases', detail: '', status: 'inferred' },
      ],
      recommended_actions: [
        { priority: 'immediate', action: 'Check the parcel status only via the courier\'s official app or a tracking page you open yourself.', reason: 'Genuine delivery issues will be visible there.' },
      ],
      missing_information: ['Whether the recipient is expecting a parcel.'],
      limitations: ['Zodon did not check whether this domain belongs to any courier.'],
    },
  },
  {
    id: 'legit-signin',
    title: 'New sign-in notification (legitimate-looking)',
    description: 'Security notice with no link that points to the official app.',
    input_type: 'text',
    expected: 'Low — no unsupported accusation',
    content:
      "Hi Jordan, we noticed a new sign-in to your Northbridge Federal account from Chrome on Windows on 12 Sep at 09:14. If this was you, no action is needed. If you don't recognise this activity, open the Northbridge app or type our address into your browser to review your security settings. We will never ask for your password or verification codes by text or email.",
    illustrativeAnalysis: {
      classification: 'benign',
      severity: 'low',
      confidence: 0.78,
      summary:
        'This looks like a routine sign-in notification. It contains no link, does not ask for credentials or payment, and directs the recipient to the official app or a typed-in address. Zodon cannot verify the sender, so if the sign-in was unexpected, check through the official app.',
      observed_indicators: [],
      inferences: [
        { description: 'The message is consistent with a legitimate automated security notice.', basis: 'It names the device and time, contains no link, and explicitly says passwords and codes will never be requested.', confidence: 0.75 },
      ],
      assumptions: [],
      attack_path: [],
      recommended_actions: [
        { priority: 'soon', action: 'If you did not sign in, review your account activity in the official app and change your password there.', reason: 'This keeps you on a trusted channel.' },
      ],
      missing_information: ['The sender address or number.'],
      limitations: ['Attackers can copy legitimate notification wording; the sender was not verified.'],
    },
  },
  {
    id: 'ambiguous-invoice',
    title: 'Colleague asks to review invoice (ambiguous)',
    description: 'Short internal-sounding message with no link or explicit request for secrets.',
    input_type: 'text',
    expected: 'Inconclusive — needs verification',
    content:
      "Hi, it's Sam from the finance team. I've shared the updated invoice with you — can you take a look before end of day? Let me know if anything looks off.",
    illustrativeAnalysis: {
      classification: 'inconclusive',
      severity: 'inconclusive',
      confidence: 0.45,
      summary:
        'This message could be a normal request from a colleague, or the opening of an invoice-fraud attempt. It contains no link, attachment name, or request for credentials or payment details, so there is not enough evidence to assess it either way.',
      observed_indicators: [],
      inferences: [
        { description: 'If the sender is not a known colleague, this may be a pretext for a follow-up link or payment-change request.', basis: 'Invoice-themed requests are common in business email compromise, but nothing suspicious is present yet.', confidence: 0.4 },
      ],
      assumptions: ['Assumes "Sam" may or may not be a real colleague — this is unknown.'],
      attack_path: [],
      recommended_actions: [
        { priority: 'immediate', action: 'Confirm with Sam through a known channel (e.g., internal chat or a phone number you already have).', reason: 'This resolves the uncertainty without risk.' },
        { priority: 'soon', action: 'Be cautious of any follow-up asking you to open a file, sign in, or change payment details.', reason: 'Those would be much stronger indicators.' },
      ],
      missing_information: ['Sender email address or number.', 'Whether a shared invoice actually exists in your usual file-sharing system.'],
      limitations: ['Short messages with no link or request provide very little evidence.'],
    },
  },
  {
    id: 'deceptive-url',
    title: 'Deceptive login URL',
    description: 'URL that embeds a bank-like domain in its subdomain.',
    input_type: 'url',
    expected: 'High — suspicious URL (structural only)',
    content: 'http://secure-login.northbridge-federal.com.verify-account.info/signin?session=8b1f2c',
    illustrativeAnalysis: {
      classification: 'suspicious_url',
      severity: 'high',
      confidence: 0.8,
      summary:
        'The URL is built so that "northbridge-federal.com" appears near the start, but the domain that actually controls it is verify-account.info. Combined with sign-in wording, this structure is typical of phishing links. The page itself was not visited.',
      observed_indicators: [
        { name: 'Domain name embedded in subdomain', evidence: 'northbridge-federal.com.verify-account.info', explanation: 'Readers may see "northbridge-federal.com" and miss that the real domain is verify-account.info.', source: 'submitted_url', confidence: 0.9 },
        { name: 'Sign-in path', evidence: '/signin', explanation: 'Suggests the page may ask for login details.', source: 'submitted_url', confidence: 0.6 },
      ],
      inferences: [
        { description: 'The page may imitate a bank sign-in form.', basis: 'Deceptive domain structure plus a "/signin" path.', confidence: 0.65 },
      ],
      assumptions: ['Assumes the name in the subdomain refers to a real organisation the user might trust.'],
      attack_path: [
        { step: 'User opens the link believing it is their bank', detail: '', status: 'inferred' },
        { step: 'Login details entered on an imitation page', detail: '', status: 'inferred' },
      ],
      recommended_actions: [
        { priority: 'immediate', action: 'Navigate to the organisation\'s website by typing its known address instead.', reason: 'Avoids relying on the URL\'s appearance.' },
      ],
      missing_information: ['Where the URL was received and from whom.'],
      limitations: ['The destination was not visited; no reputation lookup is represented in this sample.'],
    },
  },
  {
    id: 'sme-invoice-change',
    title: 'Supplier changes bank details (SME)',
    description: 'Email to an accounts team asking for an invoice to be paid into a new account.',
    input_type: 'text',
    expected: 'High — business email compromise / invoice fraud',
    content:
      'Dear Accounts Team,\nPlease note that our bank details have changed due to an ongoing audit. Kindly make payment for invoice INV-2291 (₦1,850,000) to our new account: Crestline Bank 0123456789, Adebayo Supplies Ltd. Please treat as urgent and do not use our old account.\nRegards,\nFunmi, Adebayo Supplies',
    illustrativeAnalysis: {
      classification: 'business_email_compromise',
      severity: 'high',
      confidence: 0.84,
      summary:
        'This email asks your accounts team to pay a supplier invoice into a new bank account and not to use the old one. Unannounced bank-detail changes delivered by email are the central step of invoice fraud. The message may be genuine, but the change must be confirmed with the supplier using contact details you already hold.',
      observed_indicators: [
        { name: 'Change of supplier bank details', evidence: 'our bank details have changed due to an ongoing audit', explanation: 'A change of payee details by email is the key step in payment-diversion fraud.', source: 'submitted_text', confidence: 0.9, indicates: 'risk' },
        { name: 'Instruction to stop using the old account', evidence: 'do not use our old account', explanation: 'Discourages paying the account you have previously verified.', source: 'submitted_text', confidence: 0.85, indicates: 'risk' },
        { name: 'Urgency on a large payment', evidence: 'Please treat as urgent', explanation: 'Pressure reduces the chance that the change is checked.', source: 'submitted_text', confidence: 0.75, indicates: 'risk' },
      ],
      inferences: [
        { description: 'The sender may have compromised or spoofed the supplier\'s email to divert a real payment.', basis: 'Real invoice reference plus new bank details is typical of supplier email compromise.', confidence: 0.65 },
      ],
      assumptions: ['Assumes Adebayo Supplies is a real supplier you pay, and that invoice INV-2291 exists.'],
      attack_path: [
        { step: 'Accounts team updates the payee to the new account', detail: '', status: 'inferred' },
        { step: 'Invoice payment goes to an account the supplier does not control', detail: '', status: 'inferred' },
      ],
      recommended_actions: [
        { priority: 'immediate', action: 'Hold this payment until the change is confirmed by phone with the supplier.', reason: 'Use a number from your supplier records, not from this email.' },
      ],
      missing_information: ['The sender\'s full email address and whether it matches previous emails from this supplier.'],
      limitations: ['Zodon cannot check your supplier records or the email headers.'],
      business_impact: {
        processes_at_risk: ['Supplier payments', 'Payment approvals'],
        verify_independently: ['Check that the sender address exactly matches previous emails from this supplier.'],
      },
    },
  },
  {
    id: 'ng-bvn-sms',
    title: 'BVN "revalidation" SMS (Nigeria)',
    description: 'SMS from a fictional Nigerian bank asking to revalidate BVN via a link.',
    input_type: 'text',
    expected: 'High or critical — phishing',
    content:
      'CRESTLINE BANK: Dear customer, your account has been restricted due to BVN mismatch. Kindly revalidate your BVN within 24 hours to avoid permanent blocking. Click http://crestline-bvn-update.com.verify-portal.info/login',
    illustrativeAnalysis: {
      classification: 'phishing',
      severity: 'high',
      confidence: 0.88,
      summary:
        'This SMS claims your account is restricted and asks you to "revalidate" your BVN through a link. The link\'s real domain is verify-portal.info, not a bank domain. Requests to confirm BVN or account details through a link are a common way to collect banking information.',
      observed_indicators: [
        { name: 'Request to revalidate BVN', evidence: 'Kindly revalidate your BVN within 24 hours', explanation: 'Banks do not ask customers to confirm BVN details through links in SMS.', source: 'submitted_text', confidence: 0.9, indicates: 'risk' },
        { name: 'Threat of account blocking', evidence: 'to avoid permanent blocking', explanation: 'Creates fear to rush the recipient.', source: 'submitted_text', confidence: 0.85, indicates: 'risk' },
        { name: 'Bank-like name before an unrelated domain', evidence: 'crestline-bvn-update.com.verify-portal.info', explanation: 'The link is controlled by verify-portal.info.', source: 'submitted_url', confidence: 0.9, indicates: 'risk' },
      ],
      inferences: [
        { description: 'The link probably leads to a page asking for BVN, account number, card details or internet-banking login.', basis: 'The path "/login" and the revalidation wording; the page was not visited.', confidence: 0.7 },
      ],
      assumptions: ['Assumes the recipient banks with an institution of this name.'],
      attack_path: [
        { step: 'Victim enters BVN and banking login on an imitation page', detail: '', status: 'inferred' },
        { step: 'Possible unauthorised transfers from the account', detail: '', status: 'inferred' },
      ],
      recommended_actions: [
        { priority: 'immediate', action: 'Check your account status only in your bank\'s official app or at a branch.', reason: 'A genuine restriction will show there.' },
      ],
      missing_information: ['The sender ID of the SMS.'],
      limitations: ['The link destination was not visited.'],
    },
  },
];

export function getSample(id) {
  return SAMPLES.find((s) => s.id === id) ?? null;
}

export function listSamples() {
  return SAMPLES.map(({ id, title, description, input_type, expected, content }) => ({
    id, title, description, input_type, expected, content, synthetic: true,
  }));
}
