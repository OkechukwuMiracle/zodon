import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ title = 'Something went wrong', message, code, children }) {
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-red-900">{title}</h3>
          {message && <p className="mt-1 text-sm text-red-800">{message}</p>}
          {code && <p className="mt-1 font-mono text-[11px] text-red-700/70">Code: {code}</p>}
          {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}
