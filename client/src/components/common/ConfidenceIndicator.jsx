/** Horizontal meter for a 0–1 value. Renders "Not available" when value is null. */
export default function ConfidenceIndicator({ value, label = 'AI confidence', compact = false }) {
  if (typeof value !== 'number') {
    return (
      <div className="text-sm text-slate-500">
        {!compact && <div className="label mb-1">{label}</div>}
        Not available
      </div>
    );
  }
  const pct = Math.round(value * 100);
  const tone = pct >= 75 ? 'bg-blue-600' : pct >= 50 ? 'bg-blue-400' : 'bg-slate-400';
  const word = pct >= 75 ? 'High' : pct >= 50 ? 'Moderate' : 'Low';
  return (
    <div className={compact ? 'w-24' : 'w-full'}>
      {!compact && (
        <div className="mb-1 flex items-baseline justify-between">
          <span className="label">{label}</span>
          <span className="font-mono text-sm text-slate-700">
            {pct}% <span className="text-xs text-slate-500">({word})</span>
          </span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
