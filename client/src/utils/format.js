export const SEVERITY_META = {
  critical: { label: 'Critical', badge: 'bg-red-700 text-white border-red-700', dot: 'bg-red-700', text: 'text-red-700', soft: 'bg-red-50 border-red-200' },
  high: { label: 'High', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', text: 'text-red-700', soft: 'bg-red-50 border-red-200' },
  medium: { label: 'Medium', badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50 border-amber-200' },
  low: { label: 'Low', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50 border-emerald-200' },
  inconclusive: { label: 'Inconclusive', badge: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400', text: 'text-slate-600', soft: 'bg-slate-50 border-slate-200' },
};

export const STRENGTH_LABEL = { strong: 'Strong', moderate: 'Moderate', weak: 'Weak', none: 'None' };

export function formatDateTime(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatPercent(value) {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : '—';
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const INPUT_TYPE_LABEL = { text: 'Message', url: 'URL', image: 'Screenshot' };
