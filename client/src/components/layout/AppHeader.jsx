import { Menu, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useInvestigation } from '../../hooks/InvestigationContext.jsx';

const TITLES = [
  [/^\/$/, 'Dashboard'],
  [/^\/investigate/, 'New Investigation'],
  [/^\/report\//, 'Investigation Report'],
  [/^\/history/, 'Investigation History'],
  [/^\/about/, 'About Zodon'],
];

export function AiStatus() {
  const { health, refreshHealth } = useInvestigation();
  let dot = 'bg-slate-300';
  let text = 'Checking…';
  let short = 'Checking';
  let title = 'Checking server status';
  if (health.status === 'error') {
    dot = 'bg-red-500';
    text = 'Server offline';
    short = 'Offline';
    title = 'The Zodon API could not be reached';
  } else if (health.status === 'ok') {
    const ai = health.data.ai;
    if (ai.configured) {
      dot = 'bg-emerald-500';
      text = 'AI analysis online';
      short = 'AI online';
      title = `Live analysis via ${ai.provider} (${ai.model})`;
    } else {
      dot = 'bg-amber-500';
      text = 'AI not configured';
      short = 'AI off';
      title = 'No Gemini API key on the server — samples and rule-based checks only';
    }
  }
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs whitespace-nowrap text-slate-700 sm:px-2.5" title={title}>
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{text}</span>
        {health.status === 'ok' && health.data.ai.configured && (
          <span className="hidden font-mono text-[11px] text-slate-400 xl:inline">{health.data.ai.model}</span>
        )}
      </span>
      {health.status === 'error' && (
        <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={refreshHealth} aria-label="Retry server connection">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function AppHeader({ onOpenMenu }) {
  const { pathname } = useLocation();
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Zodon';
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-6">
      <button type="button" className="-ml-1 shrink-0 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 truncate text-sm font-semibold text-slate-900 sm:text-base">{title}</h1>
      <div className="ml-auto shrink-0">
        <AiStatus />
      </div>
    </header>
  );
}
