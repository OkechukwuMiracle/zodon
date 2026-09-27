import { Building2, Sparkles, CheckSquare } from 'lucide-react';

export default function BusinessImpact({ context }) {
  return (
    <div className="grid gap-4">
      {context.processes.map((p) => (
        <div key={p.id} className="rounded-md border border-slate-200 bg-white p-4">
          <h4 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
            <Building2 className="h-4 w-4 text-slate-500" aria-hidden="true" /> {p.process}
            {p.source === 'ai' && (
              <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-px text-[10px] font-medium text-blue-700">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> AI suggestion
              </span>
            )}
          </h4>
          <p className="mt-1 text-sm text-slate-600">{p.why}</p>
          {p.verify.length > 0 && (
            <>
              <div className="label mt-3 mb-1.5">Verify independently</div>
              <ul className="grid gap-1.5">
                {p.verify.map((v) => (
                  <li key={v} className="flex gap-2 text-sm text-slate-800">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" /> {v}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
      {context.ai_verify?.length > 0 && (
        <div className="rounded-md border border-blue-100 bg-blue-50/40 p-4">
          <div className="label mb-1.5">Also suggested by the AI</div>
          <ul className="grid gap-1.5">
            {context.ai_verify.map((v) => (
              <li key={v} className="flex gap-2 text-sm text-slate-800">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" /> {v}
              </li>
            ))}
          </ul>
        </div>
      )}
      {context.note && <p className="text-xs text-slate-500">{context.note}</p>}
    </div>
  );
}
