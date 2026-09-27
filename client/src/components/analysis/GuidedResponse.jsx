import { useState } from 'react';
import { Check, Clock, Zap } from 'lucide-react';
import { INTERACTIONS, PLAYBOOK_DISCLAIMER, buildGuidedResponse, toggleInteraction } from '../../utils/responsePlaybook.js';

export default function GuidedResponse({ business = false }) {
  const [selected, setSelected] = useState([]);
  const groups = buildGuidedResponse(selected, { business });

  return (
    <div className="grid gap-5">
      <fieldset>
        <legend className="mb-2 text-sm text-slate-700">Select everything that applies. Your answer stays in this browser tab and is not sent anywhere.</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INTERACTIONS.map((opt) => {
            const checked = selected.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                  checked ? 'border-blue-600 bg-blue-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  checked={checked}
                  onChange={() => setSelected((s) => toggleInteraction(s, opt.id))}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {groups.length > 0 && (
        <div className="grid gap-4" aria-live="polite">
          {groups.map((g) => (
            <section key={g.id} aria-label={g.label}>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">{g.label}</h4>
              <ol className="grid gap-2">
                {g.steps.map((s) => (
                  <li key={s.action} className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
                    <span
                      className={`mt-0.5 inline-flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-[10px] font-semibold tracking-wide uppercase ${
                        s.urgency === 'now' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.urgency === 'now' ? <Zap className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
                      {s.urgency === 'now' ? 'Now' : 'Next'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{s.action}</div>
                      <p className="mt-0.5 text-sm text-slate-600">{s.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Check className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {PLAYBOOK_DISCLAIMER}
      </p>
    </div>
  );
}
