import { normalizeText, extractUrls, extractEmails, extractPhones } from './security/extractors.js';
import { analyzeText } from './security/textAnalyzer.js';
import { analyzeUrl } from './security/urlAnalyzer.js';
import { correlateEvidence } from './security/evidenceEngine.js';
import { assessRisk } from './security/riskEngine.js';
import { buildAttackPath } from './security/attackPathBuilder.js';
import { buildRecommendations } from './security/recommendations.js';
import { buildBusinessContext } from './security/businessContext.js';
import { buildReport } from './report/reportBuilder.js';
import { createInvestigationId } from '../utils/ids.js';
import { AppError } from '../utils/AppError.js';

/**
 * Investigation pipeline:
 * input → extraction → deterministic checks → AI analysis → evidence correlation
 *       → risk assessment → attack path → recommendations → report
 *
 * @param {{inputType:'text'|'url'|'image', text?:string, url?:string, image?:{buffer:Buffer,mime:string,name?:string,size:number}}} input
 * @param {{ai: object, reputation: object, mode?: 'live'|'sample', sample?: object}} deps
 */
export async function runInvestigation(input, { ai, reputation, mode = 'live', sample = null }) {
  const { inputType } = input;
  const id = createInvestigationId();
  const createdAt = new Date().toISOString();

  // ── Extraction & deterministic checks (text / url) ──────────────────────────
  let text = '';
  let urls = [];
  if (inputType === 'text') {
    text = normalizeText(input.text);
    urls = extractUrls(text, 5);
  } else if (inputType === 'url') {
    urls = [input.url.trim()];
  }

  const runDeterministic = async (sourceText, urlList) => {
    const textResult = inputType === 'url' ? { indicators: [], mitigating: [] } : analyzeText(sourceText);
    const urlAnalyses = urlList.map((u) => analyzeUrl(u, { contextText: sourceText }));
    const validUrls = urlAnalyses.filter((u) => u.valid).map((u) => u.normalized);
    const rep = await reputation.check(validUrls);
    return { textResult, urlAnalyses, reputation: rep };
  };

  let det = await runDeterministic(text, urls);
  const checksFor = (d) => ({ text: d.textResult.indicators, urls: d.urlAnalyses, reputation: d.reputation });

  const submission = {
    text: inputType === 'text' ? text : null,
    url: inputType === 'url' ? input.url.trim() : null,
    image: inputType === 'image' ? { name: input.image.name ?? null, size: input.image.size, mime: input.image.mime } : null,
  };

  const assemble = ({ aiOutput, aiInfo, reportMode, d, corpusText, extractedUrls }) => {
    const citationCheck = { ai_citations: 0, ai_verified: 0 };
    const evidence = correlateEvidence({
      stats: citationCheck,
      textIndicators: d.textResult.indicators,
      mitigating: d.textResult.mitigating,
      urlAnalyses: d.urlAnalyses,
      reputation: d.reputation,
      ai: aiOutput,
      corpus: inputType === 'url' ? submission.url : corpusText,
      // Same "name: evidence" format the prompt uses, so the AI can quote findings verbatim.
      checksCorpus: [
        ...d.textResult.indicators.map((i) => `${i.name}: "${i.evidence}"`),
        ...d.urlAnalyses.flatMap((u) => [u.input, u.hostname, u.registrable_domain, ...(u.findings ?? []).map((f) => `${f.name}: ${f.evidence}`)]),
      ].filter(Boolean).join('\n'),
      inputType,
    });
    const risk = assessRisk(evidence, aiOutput, {
      hasUrls: d.urlAnalyses.some((u) => u.valid),
      imageReadability: aiOutput?.image?.readability ?? null,
    });
    const attackPath = buildAttackPath({ items: evidence, risk, ai: aiOutput, inputType, urlAnalyses: d.urlAnalyses });
    const businessContext = buildBusinessContext({ items: evidence, ai: aiOutput, severity: risk.level });
    const recommendations = buildRecommendations({
      risk,
      items: evidence,
      ai: aiOutput,
      inputType,
      hasUrls: d.urlAnalyses.some((u) => u.valid),
    });
    return buildReport({
      id,
      createdAt,
      mode: reportMode,
      inputType,
      aiInfo,
      ai: aiOutput,
      risk,
      evidence,
      attackPath,
      recommendations,
      businessContext,
      citationCheck: aiOutput ? citationCheck : null,
      urlAnalyses: d.urlAnalyses,
      reputation: d.reputation,
      extracted: {
        urls: extractedUrls,
        emails: extractEmails(corpusText),
        phones: extractPhones(corpusText),
      },
      submission,
      sample,
    });
  };

  // ── AI analysis ─────────────────────────────────────────────────────────────
  let aiResult;
  try {
    aiResult = await ai.analyze({
      inputType,
      content: inputType === 'url' ? submission.url : text,
      image: inputType === 'image' ? input.image : undefined,
      checks: checksFor(det),
    });
  } catch (err) {
    if (err instanceof AppError && inputType !== 'image') {
      // Attach a clearly-labelled rule-only report so the client can show deterministic
      // checks separately. It is never presented as an AI investigation.
      const partial = assemble({
        aiOutput: null,
        aiInfo: { used: false, provider: 'Google Gemini', model: ai.model ?? null, status: ai.configured ? 'failed' : 'not_configured', error: { code: err.code, message: err.message } },
        reportMode: 'rules_only',
        d: det,
        corpusText: text,
        extractedUrls: urls,
      });
      err.details = { ...(err.details ?? {}), rules_only_report: partial };
    }
    throw err;
  }

  const aiOutput = aiResult.output;
  let corpusText = text;
  if (inputType === 'image') {
    corpusText = normalizeText(aiOutput.image?.extracted_text ?? '');
    urls = extractUrls(corpusText, 5);
    det = await runDeterministic(corpusText, urls);
  }

  return assemble({
    aiOutput,
    aiInfo: {
      used: mode === 'live',
      provider: 'Google Gemini',
      model: mode === 'live' ? aiResult.model : null,
      status: mode === 'live' ? 'completed' : 'sample',
      error: null,
      attempts: aiResult.attempts,
    },
    reportMode: mode,
    d: det,
    corpusText: inputType === 'url' ? submission.url : corpusText,
    extractedUrls: urls,
  });
}
