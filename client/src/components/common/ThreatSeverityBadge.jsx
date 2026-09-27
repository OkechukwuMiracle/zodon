import { SEVERITY_META } from '../../utils/format.js';

export default function ThreatSeverityBadge({ severity, size = 'md' }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.inconclusive;
  const sizes = size === 'lg' ? 'px-3 py-1 text-sm' : size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border font-semibold tracking-wide uppercase ${meta.badge} ${sizes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${severity === 'critical' ? 'bg-white' : meta.dot}`} aria-hidden="true" />
      {meta.label}
      <span className="sr-only"> severity</span>
    </span>
  );
}
