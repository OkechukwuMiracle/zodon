import { Route } from 'lucide-react';

export default function AttackPathTimeline({ path }) {
  if (!path?.established) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
        <Route className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        {path?.message ?? 'Not enough evidence to establish a likely attack path.'}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-slate-900" aria-hidden="true" /> Observed in submission
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-dashed border-amber-500 bg-white" aria-hidden="true" /> Inferred — not confirmed
        </span>
      </div>
      <ol className="relative">
        {path.steps.map((s, i) => {
          const inferred = s.status === 'inferred';
          const last = i === path.steps.length - 1;
          return (
            <li key={`${s.step}-${i}`} className="relative flex gap-4 pb-5 last:pb-0">
              {!last && (
                <span
                  className={`absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0 border-l-2 ${path.steps[i + 1]?.status === 'inferred' ? 'border-dashed border-amber-300' : 'border-slate-300'}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                  inferred ? 'border-2 border-dashed border-amber-500 bg-white text-amber-700' : 'bg-slate-900 text-white'
                }`}
              >
                {i + 1}
              </span>
              <div className={`min-w-0 flex-1 rounded-md border px-3 py-2 ${inferred ? 'border-dashed border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{s.step}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${inferred ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                    {inferred ? 'Inferred' : 'Observed'}
                  </span>
                </div>
                {s.detail && <p className="mt-0.5 text-xs text-slate-600">{s.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-slate-500">{path.message}</p>
    </div>
  );
}
