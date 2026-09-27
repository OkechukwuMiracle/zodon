import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, History as HistoryIcon, Trash2 } from 'lucide-react';
import HistoryTable from '../components/dashboard/HistoryTable.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import ConfirmationDialog from '../components/common/ConfirmationDialog.jsx';
import { useToast } from '../components/common/ToastNotification.jsx';
import { useInvestigation } from '../hooks/InvestigationContext.jsx';
import { filterRecords } from '../utils/history.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High / critical' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'inconclusive', label: 'Inconclusive' },
];

export default function History() {
  const { records, deleteFromHistory, clearAllHistory, historyState, settings, updateSettings } = useInvestigation();
  const { notify } = useToast();
  const [severity, setSeverity] = useState('all');
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState(null); // {type:'delete', record} | {type:'clear'}

  const visible = filterRecords(records, { severity, query });

  const onConfirm = () => {
    if (confirm?.type === 'delete') {
      if (deleteFromHistory(confirm.record.id)) notify(`Deleted ${confirm.record.id}.`, 'success');
    } else if (confirm?.type === 'clear') {
      if (clearAllHistory()) notify('Investigation history cleared.', 'success');
    }
    setConfirm(null);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Investigation history</h2>
          <p className="mt-1 text-sm text-slate-600">Stored only in this browser. Original messages and screenshots are never saved.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            checked={settings.autoSave}
            onChange={(e) => updateSettings({ ...settings, autoSave: e.target.checked })}
          />
          Automatically save live investigations
        </label>
      </div>

      {!historyState.available && (
        <ErrorState title="Browser storage unavailable" message="Your browser is blocking local storage (for example, in some private modes). History cannot be saved." />
      )}
      {historyState.corrupted && (
        <ErrorState title="Some history could not be read" message="Stored history data was damaged or in an unexpected format. Unreadable entries were ignored." />
      )}
      {historyState.error && <ErrorState title="Storage error" message={historyState.error} />}

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by severity">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={severity === f.id}
                onClick={() => setSeverity(f.id)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  severity === f.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <label htmlFor="history-search" className="sr-only">Search by investigation ID or summary</label>
              <input
                id="history-search"
                type="search"
                className="input pl-8"
                placeholder="Search ID or summary"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="button" className="btn-secondary text-red-600" onClick={() => setConfirm({ type: 'clear' })} disabled={!records.length}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Clear history</span>
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="No saved investigations"
            description="Live investigations are saved here automatically. Samples and rule-only results can be saved from the report page."
            action={<Link to="/investigate" className="btn-primary">Start an investigation</Link>}
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} title="No matching investigations" description="Try a different severity filter or search term." />
        ) : (
          <>
            <HistoryTable records={visible} onDelete={(record) => setConfirm({ type: 'delete', record })} />
            <div className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500">
              Showing {visible.length} of {records.length}
            </div>
          </>
        )}
      </div>

      <ConfirmationDialog
        open={!!confirm}
        danger
        title={confirm?.type === 'clear' ? 'Clear all investigation history?' : 'Delete this investigation?'}
        description={
          confirm?.type === 'clear'
            ? `This permanently removes all ${records.length} saved investigations from this browser.`
            : `This permanently removes ${confirm?.record?.id ?? ''} from this browser.`
        }
        confirmLabel={confirm?.type === 'clear' ? 'Clear history' : 'Delete'}
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
