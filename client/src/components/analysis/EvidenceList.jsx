import { useState } from 'react';
import { SearchX } from 'lucide-react';
import EvidenceCard from './EvidenceCard.jsx';
import { KIND_META } from './evidenceMeta.js';
import EmptyState from '../common/EmptyState.jsx';

const GROUPS = [
  { kind: 'observed', description: 'Directly present in the submission or produced by deterministic checks.' },
  { kind: 'interpretation', description: 'What the AI thinks this means. Not independently verified.' },
  { kind: 'assumption', description: 'Things taken for granted that have not been checked.' },
];

export default function EvidenceList({ items }) {
  const counts = Object.fromEntries(GROUPS.map((g) => [g.kind, items.filter((i) => i.kind === g.kind).length]));
  const [active, setActive] = useState(() => GROUPS.find((g) => counts[g.kind])?.kind ?? 'observed');
  const group = GROUPS.find((g) => g.kind === active);
  const visible = items
    .filter((i) => i.kind === active)
    .sort((a, b) => (a.polarity === 'mitigating') - (b.polarity === 'mitigating') || rank(b.strength) - rank(a.strength));

  return (
    <div>
      <div role="tablist" aria-label="Evidence type" className="mb-3 flex flex-wrap gap-2">
        {GROUPS.map((g) => {
          const Icon = KIND_META[g.kind].icon;
          const selected = g.kind === active;
          return (
            <button
              key={g.kind}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(g.kind)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {KIND_META[g.kind].label}
              <span className={`rounded px-1.5 font-mono text-xs ${selected ? 'bg-white/15' : 'bg-slate-100 text-slate-600'}`}>{counts[g.kind]}</span>
            </button>
          );
        })}
      </div>
      <p className="mb-3 text-xs text-slate-500">{group.description}</p>
      {visible.length ? (
        <div className="grid gap-3">
          {visible.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title={active === 'observed' ? 'No observed risk indicators' : 'Nothing in this category'}
            description={
              active === 'observed'
                ? 'Neither the rule-based checks nor verified AI findings identified risk indicators in this content. That is not proof it is safe.'
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

function rank(s) {
  return { strong: 3, moderate: 2, weak: 1 }[s] ?? 0;
}
