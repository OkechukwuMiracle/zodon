import { z } from 'zod';
import { safeParseUrl } from '../services/security/urlAnalyzer.js';

export function makeTextSchema(maxChars) {
  return z.object({
    text: z
      .string({ error: 'Text is required.' })
      .refine((s) => s.trim().length > 0, 'Please paste the message you want to investigate.')
      .refine((s) => s.trim().length >= 5, 'The message is too short to analyse.')
      .refine((s) => s.length <= maxChars, `The message is longer than ${maxChars.toLocaleString('en-US')} characters.`),
  }).strict();
}

export const UrlBodySchema = z
  .object({
    url: z
      .string({ error: 'URL is required.' })
      .superRefine((value, ctx) => {
        const parsed = safeParseUrl(value);
        if (!parsed.ok) ctx.addIssue({ code: 'custom', message: parsed.reason });
      }),
  })
  .strict();

export const SampleBodySchema = z
  .object({ sample_id: z.string().trim().min(1).max(64).default('bank-phishing') })
  .strict();
