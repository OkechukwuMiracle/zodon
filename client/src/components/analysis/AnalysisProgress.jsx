import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const STAGES = [
  { label: 'Validating input', at: 0 },
  { label: 'Extracting content and indicators', at: 400 },
  { label: 'Running deterministic security checks', at: 900 },
  { label: 'AI analysis with Gemini', at: 1500 },
  { label: 'Correlating evidence', at: null },
  { label: 'Assessing risk and attack path', at: null },
  { label: 'Building investigation report', at: null },
];
const SAMPLE_STAGES = [
  { label: 'Loading synthetic sample', at: 0 },
  { label: 'Running deterministic security checks', at: 250 },
  { label: 'Applying illustrative (pre-written) analysis', at: 500 },
  { label: 'Building report', at: null },
];

/**
 * The server does not stream progress, so stages advance on a timer up to the AI step
 * and the remaining steps complete when the response arrives. Shown as "estimated".
 */
export default function AnalysisProgress({ inputType, onCancel }) {
  const stages = inputType === 'sample' ? SAMPLE_STAGES : STAGES;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 200);
    return () => clearInterval(t);
  }, []);

  const active = stages.reduce((idx, s, i) => (s.at !== null && elapsed >= s.at ? i : idx), 0);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5" aria-live="polite" aria-busy="true">
      <div className="relative mb-4 h-1 overflow-hidden rounded bg-slate-100">
        <div className="animate-scan absolute inset-y-0 w-1/3 bg-blue-600/70" />
      </div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Investigation in progress</h3>
        <span className="font-mono text-xs text-slate-500">{(elapsed / 1000).toFixed(1)}s</span>
      </div>
      <ol className="space-y-2">
        {stages.map((s, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={s.label} className={`flex items-center gap-2.5 text-sm ${done ? 'text-slate-700' : current ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
              <span className="flex h-4 w-4 items-center justify-center">
                {done ? (
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : current ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden="true" />
                )}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">
          {inputType === 'image' ? 'Screenshot analysis can take 10–30 seconds.' : 'Live AI analysis usually takes 5–20 seconds.'} Stage timing is estimated.
        </p>
        <button type="button" className="btn-ghost text-xs" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
