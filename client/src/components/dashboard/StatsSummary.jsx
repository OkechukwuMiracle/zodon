import { computeStats } from '../../utils/history.js';

export default function StatsSummary({ records }) {
  const s = computeStats(records);
  const tiles = [
    { label: 'Total investigations', value: s.total, accent: 'bg-blue-600' },
    { label: 'High / critical risk', value: s.high, accent: 'bg-red-500' },
    { label: 'Medium risk', value: s.medium, accent: 'bg-amber-500' },
    { label: 'Low risk / no threat found', value: s.low, accent: 'bg-emerald-500' },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card relative overflow-hidden p-4">
            <span className={`absolute inset-y-0 left-0 w-1 ${t.accent}`} aria-hidden="true" />
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="mt-1 font-mono text-2xl font-semibold text-slate-900">{t.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        From investigations saved in this browser{s.inconclusive ? ` · ${s.inconclusive} inconclusive` : ''}
        {s.samples ? ` · ${s.samples} synthetic sample${s.samples === 1 ? '' : 's'} excluded` : ''}.
      </p>
    </div>
  );
}
