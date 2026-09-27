import { OctagonAlert, ListChecks, LifeBuoy, Sparkles } from 'lucide-react';

const GROUPS = [
  { priority: 'immediate', title: 'Do now', icon: OctagonAlert, tone: 'text-red-700', marker: 'bg-red-600 text-white' },
  { priority: 'soon', title: 'Next steps', icon: ListChecks, tone: 'text-slate-800', marker: 'bg-slate-800 text-white' },
  { priority: 'if_interacted', title: 'If you already clicked, replied, paid or entered information', icon: LifeBuoy, tone: 'text-amber-800', marker: 'bg-amber-500 text-white' },
];

export default function RecommendedActions({ items }) {
  // Continuous numbering across groups, computed up front (no mutation during render).
  const grouped = GROUPS.map((g) => ({ g, list: items.filter((i) => i.priority === g.priority) }));
  const offsets = grouped.map((_, idx) => grouped.slice(0, idx).reduce((s, x) => s + x.list.length, 0));
  return (
    <div className="grid gap-5">
      {grouped.map(({ g, list }, gi) => {
        if (!list.length) return null;
        const Icon = g.icon;
        return (
          <section key={g.priority} aria-label={g.title}>
            <h4 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${g.tone}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {g.title}
            </h4>
            <ol className="grid gap-2">
              {list.map((r, i) => {
                const n = offsets[gi] + i + 1;
                return (
                  <li key={`${r.priority}-${r.action}`} className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold ${g.marker}`}>{n}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        {r.action}
                        {r.source === 'ai' && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-px align-middle text-[10px] font-medium text-blue-700">
                            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> AI suggestion
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{r.reason}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <p className="text-xs text-slate-500">
        Following these steps reduces risk but cannot guarantee protection. Zodon will never ask for your passwords, codes or banking details.
      </p>
    </div>
  );
}
