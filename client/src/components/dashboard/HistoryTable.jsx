import { Link } from 'react-router-dom';
import { Trash2, ChevronRight } from 'lucide-react';
import ThreatSeverityBadge from '../common/ThreatSeverityBadge.jsx';
import { formatDateTime, INPUT_TYPE_LABEL } from '../../utils/format.js';

export default function HistoryTable({ records, onDelete, compact = false }) {
  return (
    <ul className="divide-y divide-slate-100">
      {records.map((r) => (
        <li key={r.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
          <div className="hidden w-28 shrink-0 sm:block">
            <ThreatSeverityBadge severity={r.assessment.severity} size="sm" />
          </div>
          <Link to={`/report/${r.id}`} className="min-w-0 flex-1 focus:outline-none">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="sm:hidden">
                <ThreatSeverityBadge severity={r.assessment.severity} size="sm" />
              </span>
              <span className="text-sm font-medium text-slate-900 group-hover:text-blue-700">{r.classification_label}</span>
              {r.mode === 'sample' && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">Sample</span>}
              {r.mode === 'rules_only' && <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">Rules only</span>}
            </div>
            <p className={`text-sm text-slate-600 ${compact ? 'truncate' : 'line-clamp-2'}`}>{r.summary}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-slate-400">
              <span>{r.id}</span>
              <span>{formatDateTime(r.created_at)}</span>
              <span>{INPUT_TYPE_LABEL[r.input_type]}</span>
            </div>
          </Link>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(r)}
              className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete investigation ${r.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
          )}
        </li>
      ))}
    </ul>
  );
}
