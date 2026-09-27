import { describe, it, expect } from 'vitest';
import { buildGuidedResponse, toggleInteraction, INTERACTIONS, PLAYBOOK_DISCLAIMER } from '../src/utils/responsePlaybook.js';

const allText = (groups) => groups.flatMap((g) => g.steps.map((s) => `${s.action} ${s.reason}`)).join(' ');

describe('guided response playbook', () => {
  it('offers the six required situations', () => {
    expect(INTERACTIONS.map((i) => i.id)).toEqual(['none', 'clicked_link', 'entered_info', 'shared_secret', 'paid', 'opened_file']);
  });

  it('returns nothing until the user selects something', () => {
    expect(buildGuidedResponse([])).toEqual([]);
  });

  it('"not interacted" is exclusive of the other options', () => {
    expect(toggleInteraction(['paid', 'clicked_link'], 'none')).toEqual(['none']);
    expect(toggleInteraction(['none'], 'paid')).toEqual(['paid']);
    expect(toggleInteraction(['paid'], 'paid')).toEqual([]);
  });

  it('sends users who shared secrets to official channels to secure the account', () => {
    const text = allText(buildGuidedResponse(['shared_secret']));
    expect(text).toMatch(/official app/);
    expect(text).toMatch(/change your password/);
    expect(text).toMatch(/Do not use numbers given in the suspicious message/);
  });

  it('tells users who paid to contact their bank through a verified channel and warns about recovery scams', () => {
    const text = allText(buildGuidedResponse(['paid']));
    expect(text).toMatch(/verified channel/);
    expect(text).toMatch(/recover/);
  });

  it('never claims compromise or promises that Zodon acts for the user', () => {
    for (const i of INTERACTIONS) {
      const text = allText(buildGuidedResponse([i.id]));
      // Any sentence mentioning compromise/infection must be hedged or negated, never an assertion.
      const claims = text.split(/(?<=[.!?])\s+/).filter((s) => /\b(hacked|compromised|infected)\b/i.test(s));
      for (const s of claims) expect(s, s).toMatch(/\b(not|cannot|may|in case|if)\b/i);
      expect(text).not.toMatch(/\bzodon (will|has) (block|contact|report|freeze)/i);
      expect(text).not.toMatch(/\b(send|share|enter) (us|zodon) your\b/i);
    }
    expect(PLAYBOOK_DISCLAIMER).toMatch(/cannot tell whether/);
    expect(PLAYBOOK_DISCLAIMER).toMatch(/does not take any action/);
  });

  it('deduplicates steps across selections and adds business guidance only when relevant', () => {
    const groups = buildGuidedResponse(['entered_info', 'shared_secret'], { business: true });
    const actions = groups.flatMap((g) => g.steps.map((s) => s.action));
    expect(new Set(actions).size).toBe(actions.length);
    expect(groups[0].id).toBe('business');
    expect(buildGuidedResponse(['clicked_link'], { business: true }).some((g) => g.id === 'business')).toBe(false);
  });
});
