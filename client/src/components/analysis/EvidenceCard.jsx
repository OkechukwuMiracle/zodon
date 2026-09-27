import { ShieldCheck, Link2 } from 'lucide-react';
import { KIND_META } from './evidenceMeta.js';
import { formatPercent, STRENGTH_LABEL } from '../../utils/format.js';


const STRENGTH_TONE = {
  strong: 'bg-red-50 text-red-700 border-red-200',
  moderate: 'bg-amber-50 text-amber-800 border-amber-200',
  weak: 'bg-slate-50 text-slate-600 border-slate-200',
};

const EVIDENCE_TYPE_LABEL = {
  text: 'Quoted from the submission',
  url_component: 'URL component',
  visual: 'Visual detail described by AI (not verifiable by Zodon)',
};

/** Render the excerpt with the exact matched phrase highlighted (plain React text; no HTML injection). */
function Highlighted({ text, match }) {
  if (!match) return text;
  const i = text.toLowerCase().indexOf(match.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-amber-200/80 px-0.5 text-slate-900">{text.slice(i, i + match.length)}</mark>
      {text.slice(i + match.length)}
    </>
  );
}

export default function EvidenceCard({ item }) {
  const mitigating = item.polarity === 'mitigating';
  const meta = KIND_META[item.kind] ?? KIND_META.observed;
  const Icon = mitigating ? ShieldCheck : meta.icon;
  const border = mitigating ? 'border-l-emerald-500' : item.kind === 'observed' && item.strength === 'strong' ? 'border-l-red-500' : meta.border;

  return (
    <article className={`card border-l-4 p-4 ${border} ${item.kind === 'assumption' ? 'bg-slate-50/60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="flex min-w-0 items-start gap-2 text-sm font-semibold text-slate-900">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${mitigating ? 'text-emerald-600' : 'text-slate-500'}`} aria-hidden="true" />
          <span className="min-w-0">{item.title}</span>
        </h4>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase ${mitigating ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : meta.chip}`}>
            {mitigating ? 'Mitigating' : meta.label}
          </span>
          {item.strength && !mitigating && (
            <span className={`rounded border px-1.5 py-0.5 text-[10.5px] font-medium ${STRENGTH_TONE[item.strength]}`}>
              {STRENGTH_LABEL[item.strength]} signal
            </span>
          )}
          {item.corroborated && (
            <span className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-blue-700" title="Found by both rule-based checks and the AI">
              Rule + AI
            </span>
          )}
        </div>
      </div>

      {item.evidence && (
        <div className="mt-3">
          <div className="mb-1 text-[10.5px] font-medium tracking-wide text-slate-500 uppercase">{EVIDENCE_TYPE_LABEL[item.evidence_type] ?? 'Cited evidence'}</div>
          <blockquote className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-slate-800">
            <Highlighted text={item.evidence} match={item.match} />
          </blockquote>
        </div>
      )}
      {item.url && (
        <div className="mt-2 flex items-center gap-1.5 truncate font-mono text-[11px] text-slate-500">
          <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.url}</span>
        </div>
      )}
      {item.kind !== 'assumption' && <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.explanation}</p>}
      {item.ai_note && item.ai_note !== item.explanation && (
        <p className="mt-2 border-l-2 border-blue-200 pl-2 text-xs text-slate-600">
          <span className="font-medium text-blue-800">AI note:</span> {item.ai_note}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>
          <span className="font-medium text-slate-600">Source:</span> {item.source_label}
        </span>
        {item.category_label && item.kind === 'observed' && (
          <span>
            <span className="font-medium text-slate-600">Category:</span> {item.category_label}
          </span>
        )}
        {typeof item.confidence === 'number' && (
          <span>
            <span className="font-medium text-slate-600">AI confidence:</span> {formatPercent(item.confidence)}
          </span>
        )}
      </div>
    </article>
  );
}
