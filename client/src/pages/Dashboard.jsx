import { Link } from 'react-router-dom';
import { ScanSearch, History as HistoryIcon, ArrowRight, Eye, Sparkles, Route, ShieldCheck } from 'lucide-react';
import InvestigationInput from '../components/analysis/InvestigationInput.jsx';
import StatsSummary from '../components/dashboard/StatsSummary.jsx';
import HistoryTable from '../components/dashboard/HistoryTable.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useInvestigation } from '../hooks/InvestigationContext.jsx';

const STEPS = [
  { icon: Eye, title: 'Observe', text: 'Rule-based checks extract indicators from the text and URL structure.' },
  { icon: Sparkles, title: 'Interpret', text: 'Gemini explains the content, kept separate from observed evidence.' },
  { icon: Route, title: 'Map', text: 'An attack path is shown only when evidence supports one.' },
  { icon: ShieldCheck, title: 'Respond', text: 'Prioritised, practical steps for before and after interaction.' },
];

export default function Dashboard() {
  const { records } = useInvestigation();
  return (
    <div className="grid grid-cols-1 gap-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Zodon</h2>
          <p className="mt-1 text-base text-slate-600">AI Cyber Incident Investigator</p>
          <p className="mt-2 text-sm text-slate-500">See the threat. Understand the attack. Take action.</p>
        </div>
        <Link to="/investigate" className="btn-primary self-start sm:self-auto">
          <ScanSearch className="h-4 w-4" aria-hidden="true" /> Start Investigation
        </Link>
      </section>

      <section aria-label="Quick investigation">
        <InvestigationInput />
      </section>

      <section aria-labelledby="summary-title">
        <h2 id="summary-title" className="mb-3 text-sm font-semibold text-slate-900">Investigation summary</h2>
        <StatsSummary records={records} />
      </section>

      <section className="card" aria-labelledby="recent-title">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 id="recent-title" className="text-sm font-semibold text-slate-900">Recent investigations</h2>
          {records.length > 0 && (
            <Link to="/history" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        {records.length ? (
          <HistoryTable records={records.slice(0, 5)} compact />
        ) : (
          <EmptyState
            icon={HistoryIcon}
            title="No investigations yet"
            description="Analyse a message, screenshot or URL above, or try a synthetic sample. Results are saved in this browser only."
          />
        )}
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="mb-3 text-sm font-semibold text-slate-900">How Zodon investigates</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="font-mono text-xs text-slate-400">{i + 1}</span>
                <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" /> {title}
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
