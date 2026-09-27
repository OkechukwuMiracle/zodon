/**
 * Guided incident-response playbook. Deterministic, precautionary guidance based on
 * what the user says happened. It never concludes that an account or device is
 * compromised and never acts on the user's behalf.
 */

export const INTERACTIONS = [
  { id: 'none', label: 'I have not interacted with the suspicious content' },
  { id: 'clicked_link', label: 'I clicked the link' },
  { id: 'entered_info', label: 'I entered personal or account information' },
  { id: 'shared_secret', label: 'I shared a password or one-time code' },
  { id: 'paid', label: 'I made a payment or transferred money' },
  { id: 'opened_file', label: 'I downloaded or opened a file' },
];

const step = (urgency, action, reason) => ({ urgency, action, reason });

const PLAYBOOK = {
  none: [
    step('now', 'Do not reply, click links, open attachments or make payments from this message.', 'Not interacting keeps the risk low.'),
    step('now', 'If you need to check the claim, contact the organisation or person through a channel you already trust.', 'Use their official app, a website address you type yourself, or a phone number you already have.'),
    step('soon', 'Report the message and then delete or block it.', 'Use your messaging or email app\'s report feature, or your organisation\'s IT or security contact.'),
  ],
  clicked_link: [
    step('now', 'Close the page without entering anything further.', 'Opening a link on its own usually does not give anyone access to your accounts, but the page may have tried to collect information or start a download.'),
    step('now', 'Do not open any file that downloaded after clicking.', 'Delete it, or ask your IT support to check it.'),
    step('soon', 'Keep your browser and device updated, and run your device\'s built-in security scan.', 'This is a precaution; it does not mean your device is infected.'),
  ],
  entered_info: [
    step('now', 'Open the affected service yourself—through its official app or a web address you type—and change your password.', 'If the page was fake, the details you entered may be known to someone else. Do not use links from the message.'),
    step('now', 'Turn on multi-factor authentication and sign out of other sessions or devices where the service allows it.', 'This can cut off access if someone has signed in with your details.'),
    step('soon', 'Review recent account activity and change the same password anywhere else you reused it.', 'Reused passwords let one leak affect several accounts.'),
    step('soon', 'If you entered ID or banking identifiers (for example BVN, NIN, card or account numbers), contact the institution through its official channels.', 'Ask how to protect the account and whether to watch for particular activity.'),
    step('soon', 'Expect follow-up contact that uses your details to seem genuine.', 'Scammers often call back pretending to be the bank or support team. Hang up and call the official number yourself.'),
  ],
  shared_secret: [
    step('now', 'Sign in to the service through its official app or a web address you type yourself, and change your password now.', 'A shared password or code may allow someone to sign in or approve a transaction.'),
    step('now', 'Contact the provider (for example your bank) using the number on your card, statement or official app, and tell them a code was shared.', 'They may be able to block a pending transaction or secure the account. Do not use numbers given in the suspicious message.'),
    step('soon', 'Remove unknown devices, sign out other sessions and turn on multi-factor authentication.', 'This limits any access that may already exist.'),
    step('soon', 'Change the same password anywhere else you used it.', 'Reused passwords are commonly tried on other services.'),
  ],
  paid: [
    step('now', 'Contact your bank or payment provider immediately through a verified channel (the number on your card, statement or official app).', 'Ask whether the payment can be stopped, recalled or disputed. Acting quickly gives the best chance.'),
    step('now', 'Keep the evidence: messages, account numbers, receipts, amounts and times.', 'Your bank and any fraud report will need these details.'),
    step('soon', 'Report the fraud to your bank and through your country\'s official fraud-reporting or police channels.', 'Reports help investigations and may be needed for disputes.'),
    step('soon', 'Do not pay anyone who offers to "recover" the money for a fee.', 'Recovery offers are a common second scam targeting people who have already lost money.'),
  ],
  opened_file: [
    step('now', 'Disconnect the device from the internet or network.', 'This limits what a malicious file could do if it is harmful. It is a precaution—opening a file does not always mean the device is infected.'),
    step('now', 'If this is a work device, contact your IT or security team now.', 'They can check the device and protect other systems.'),
    step('soon', 'Run a full scan with up-to-date security software, or ask a trusted professional to check the device.', 'Do not enter passwords on the device until it has been checked.'),
    step('soon', 'Change important passwords from a different device you trust.', 'This protects accounts in case the file recorded what you typed.'),
  ],
};

const BUSINESS_EXTRA = step('now', 'Tell your manager or finance lead now, and pause any pending payment to the new or requested account details.', 'In business payment fraud, stopping the next payment matters as much as recovering the last one. Keep payment decisions with the people authorised to make them.');

export const PLAYBOOK_DISCLAIMER =
  'Zodon cannot tell whether an account or device has been compromised. These are precautionary steps based on what you selected, and Zodon does not take any action on your behalf.';

/**
 * @param {string[]} selected interaction ids
 * @param {{business?: boolean}} context
 * @returns {{id: string, label: string, steps: object[]}[]}
 */
export function buildGuidedResponse(selected, { business = false } = {}) {
  const ids = selected.includes('none') ? ['none'] : selected.filter((id) => PLAYBOOK[id]);
  const seen = new Set();
  const groups = ids.map((id) => {
    const steps = PLAYBOOK[id].filter((s) => {
      if (seen.has(s.action)) return false;
      seen.add(s.action);
      return true;
    });
    return { id, label: INTERACTIONS.find((i) => i.id === id).label, steps };
  });
  const risky = ids.some((id) => ['entered_info', 'shared_secret', 'paid'].includes(id));
  if (business && risky) groups.unshift({ id: 'business', label: 'Your business', steps: [BUSINESS_EXTRA] });
  return groups;
}

/** Toggle an option; "none" is mutually exclusive with the others. */
export function toggleInteraction(selected, id) {
  if (id === 'none') return selected.includes('none') ? [] : ['none'];
  const without = selected.filter((x) => x !== 'none');
  return without.includes(id) ? without.filter((x) => x !== id) : [...without, id];
}
