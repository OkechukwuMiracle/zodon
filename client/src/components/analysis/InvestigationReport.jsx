import { useNavigate } from 'react-router-dom';
import { Copy, Download, Printer, Save, Check, Plus, FlaskConical, Cpu, AlertTriangle, Info, FileText, ShieldCheck } from 'lucide-react';
import ThreatSeverityBadge from '../common/ThreatSeverityBadge.jsx';
import ConfidenceIndicator from '../common/ConfidenceIndicator.jsx';
import EvidenceList from './EvidenceList.jsx';
import AttackPathTimeline from './AttackPathTimeline.jsx';
import RecommendedActions from './RecommendedActions.jsx';
import UrlAnalysisPanel from './UrlAnalysisPanel.jsx';
import GuidedResponse from './GuidedResponse.jsx';
import BusinessImpact from './BusinessImpact.jsx';
import { useToast } from '../common/ToastNotification.jsx';
import { useInvestigation } from '../../hooks/InvestigationContext.jsx';
import { SEVERITY_META, STRENGTH_LABEL, formatDateTime, formatBytes, INPUT_TYPE_LABEL } from '../../utils/format.js';
import { reportToText, downloadJson } from '../../utils/reportText.js';

function Section({ number, title, children, aside }) {
  return (
    <section className="card p-3.5 sm:p-6" aria-labelledby={`section-${number}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`section-${number}`} className="flex items-baseline gap-2.5 text-base font-semibold text-slate-900">
          <span className="font-mono text-xs text-slate-400">{String(number).padStart(2, '0')}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EngineLabel({ report }) {
  if (report.mode === 'sample') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-800">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Synthetic sample · illustrative analysis
      </span>
    );
  }
  if (report.mode === 'rules_only') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Rule-based checks only · no AI analysis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <Cpu className="h-3.5 w-3.5" aria-hidden="true" /> {report.ai.provider} · <span className="font-mono">{report.ai.model}</span> + deterministic checks
    </span>
  );
}

function StrengthMeter({ value }) {
  const levels = ['weak', 'moderate', 'strong'];
  const idx = levels.indexOf(value);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="label">Evidence strength</span>
        <span className="text-sm font-medium text-slate-800">{STRENGTH_LABEL[value] ?? value}</span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {levels.map((l, i) => (
          <div key={l} className={`h-1.5 flex-1 rounded-full ${i <= idx ? (idx === 2 ? 'bg-slate-900' : idx === 1 ? 'bg-slate-600' : 'bg-slate-400') : 'bg-slate-200'}`} />
        ))}
      </div>
    </div>
  );
}

function ReportActions({ report }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isSaved, saveToHistory } = useInvestigation();
  const saved = isSaved(report.id);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportToText(report));
      notify('Report copied to clipboard.', 'success');
    } catch {
      notify('Could not access the clipboard. Try downloading the JSON instead.', 'error');
    }
  };
  const save = () => {
    if (saveToHistory(report)) notify('Saved to investigation history (without the original submission).', 'success');
    else notify('Could not save to browser storage.', 'error');
  };

  return (
    <div className="no-print grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
      <button type="button" className="btn-secondary" onClick={copy}>
        <Copy className="h-4 w-4" aria-hidden="true" /> Copy Report
      </button>
      <button type="button" className="btn-secondary" onClick={() => downloadJson(report)}>
        <Download className="h-4 w-4" aria-hidden="true" /> Download JSON
      </button>
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        <Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF
      </button>
      <button type="button" className="btn-secondary" onClick={save} disabled={saved}>
        {saved ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
        {saved ? 'Saved to History' : 'Save to History'}
      </button>
      <button type="button" className="btn-primary min-[420px]:col-span-2 sm:col-span-1" onClick={() => navigate('/investigate')}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Start New Investigation
      </button>
    </div>
  );
}

export default function InvestigationReport({ report, preview, source }) {
  const a = report.assessment;
  const sev = SEVERITY_META[a.severity] ?? SEVERITY_META.inconclusive;
  const hasBusiness = Boolean(report.business_context?.applies);
  // Sequential section numbers; optional sections do not leave gaps.
  const order = ['summary', 'assessment', ...(hasBusiness ? ['business'] : []), 'evidence', 'path', 'actions', 'guided', 'submission', ...(report.processing ? ['processing'] : []), 'report'];
  const num = Object.fromEntries(order.map((k, i) => [k, i + 1]));

  return (
    <div className="grid grid-cols-1 gap-5">
      {report.notices?.map((n) => (
        <div key={n} role="note" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {n}
        </div>
      ))}

      {/* Header */}
      <header className={`card overflow-hidden`}>
        <div className={`h-1 ${sev.dot}`} aria-hidden="true" />
        <div className="p-3.5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="font-mono text-slate-700">{report.id}</span>
            <time dateTime={report.created_at}>{formatDateTime(report.created_at)}</time>
            <span>{INPUT_TYPE_LABEL[report.input_type]} investigation</span>
            <EngineLabel report={report} />
          </div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="label mb-1.5">Threat assessment</div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight break-words text-slate-900 sm:text-2xl lg:text-[28px]">{report.classification_label}</h2>
                <ThreatSeverityBadge severity={a.severity} size="lg" />
              </div>
            </div>
            <div className="w-full max-w-xs">
              <ConfidenceIndicator value={a.ai_confidence} label={report.mode === 'sample' ? 'Illustrative confidence' : 'AI confidence'} />
            </div>
          </div>
        </div>
      </header>

      <ReportActions report={report} />

      <Section number={num.summary} title="Executive Summary">
        <p className="text-[15px] leading-relaxed text-slate-800">{report.summary}</p>
        <p className="mt-3 text-xs text-slate-500">{a.disclaimer}</p>
      </Section>

      <Section number={num.assessment} title="Threat Assessment">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="label mb-1">Classification</div>
            <div className="text-sm font-semibold text-slate-900">{report.classification_label}</div>
          </div>
          <div className={`rounded-md border p-3 ${sev.soft}`}>
            <div className="label mb-1">Severity</div>
            <div className={`text-sm font-semibold ${sev.text}`}>{sev.label}</div>
            {a.ai_severity && a.ai_severity !== a.severity && (
              <div className="mt-0.5 text-[11px] text-slate-500">AI rated: {SEVERITY_META[a.ai_severity]?.label}</div>
            )}
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <ConfidenceIndicator value={a.ai_confidence} label={report.mode === 'sample' ? 'Illustrative confidence' : 'AI confidence'} />
            <div className="mt-1 text-[11px] text-slate-500">How sure the AI is — not how dangerous it is.</div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <StrengthMeter value={a.evidence_strength} />
            <div className="mt-1 text-[11px] text-slate-500">Rule score {a.score} · {a.contributing.length} indicator categories</div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Why this severity</h3>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {a.rationale.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                  {r}
                </li>
              ))}
            </ul>
            {a.contributing.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.contributing.map((c) => (
                  <span key={c.category} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                    {c.label} <span className="text-slate-400">· {c.strength}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Assessment limitations</h3>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {report.limitations.map((l) => (
                <li key={l} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                  {l}
                </li>
              ))}
            </ul>
            {report.missing_information?.length > 0 && (
              <>
                <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-900">Missing information</h3>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {report.missing_information.map((m) => (
                    <li key={m} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                      {m}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </Section>

      {hasBusiness && (
        <Section number={num.business} title="Business Process at Risk">
          <BusinessImpact context={report.business_context} />
        </Section>
      )}

      <Section number={num.evidence} title="Evidence">
        {report.citation_check && report.citation_check.ai_citations > 0 && (
          <p className="mb-3 text-xs text-slate-600">
            Citation check: {report.citation_check.ai_verified} of {report.citation_check.ai_citations} AI-cited excerpts were found in your submission.
            {report.citation_check.ai_verified < report.citation_check.ai_citations && ' The rest are shown as AI interpretations, not evidence.'}
          </p>
        )}
        <EvidenceList items={report.evidence} />
        {report.url_analysis?.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">URL structure</h3>
            <UrlAnalysisPanel analyses={report.url_analysis} reputation={report.reputation} />
          </div>
        )}
      </Section>

      <Section number={num.path} title="Attack Path">
        <AttackPathTimeline path={report.attack_path} />
      </Section>

      <Section number={num.actions} title="Recommended Actions">
        <RecommendedActions items={report.recommendations} />
      </Section>

      <Section number={num.guided} title="What Happened? Guided Response">
        <GuidedResponse business={hasBusiness} />
      </Section>

      <Section number={num.submission} title="Original Submission">
        {source === 'history' || !preview ? (
          <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              For privacy, the original submission is not stored in history.
              {report.submission?.url && (
                <div className="mt-1 font-mono text-xs break-all text-slate-800">URL: {report.submission.url}</div>
              )}
              {report.submission?.text_length && <div className="mt-1 text-xs">Message length: {report.submission.text_length} characters.</div>}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {preview.text && (
              <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-slate-800">
                {preview.text}
              </pre>
            )}
            {preview.url && <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[12.5px] break-all">{preview.url}</div>}
            {preview.imageUrl && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="label mb-2">Screenshot (this session only)</div>
                  <img src={preview.imageUrl} alt="Submitted screenshot" className="max-h-96 w-full rounded-md border border-slate-200 bg-white object-contain" />
                  {report.submission?.image && (
                    <div className="mt-1 text-xs text-slate-500">
                      {report.submission.image.mime} · {formatBytes(report.submission.image.size)}
                    </div>
                  )}
                </div>
                {report.image && (
                  <div>
                    <div className="label mb-2">
                      Text transcribed by AI · readability: <span className="normal-case">{report.image.readability}</span>
                    </div>
                    <pre className="max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[12px] break-words whitespace-pre-wrap text-slate-800">
                      {report.image.extracted_text || '(no readable text)'}
                    </pre>
                    {report.image.visual_observations?.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                        {report.image.visual_observations.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500">Shown for this session only. It is not saved to history or included in the page URL.</p>
          </div>
        )}
      </Section>

      {report.processing && (
        <Section number={num.processing} title="How This Submission Was Processed">
          <ul className="grid gap-1.5 text-sm text-slate-700">
            {report.processing.statements.map((s) => (
              <li key={s} className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /> {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section number={num.report} title="Report Actions">
        <ReportActions report={report} />
      </Section>
    </div>
  );
}
