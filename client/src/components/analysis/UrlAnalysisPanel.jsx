import { Globe } from 'lucide-react';

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 font-mono text-[12.5px] break-all text-slate-800">{children}</dd>
    </div>
  );
}

export default function UrlAnalysisPanel({ analyses, reputation }) {
  if (!analyses?.length) return null;
  return (
    <div className="grid gap-3">
      {analyses.map((u) => (
        <div key={u.input} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-start gap-2">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="min-w-0 font-mono text-[12.5px] break-all text-slate-900">{u.input}</div>
          </div>
          {u.valid ? (
            <>
              <dl className="divide-y divide-slate-100">
                <Row label="Registrable domain">
                  <span className="rounded bg-yellow-100 px-1 font-semibold">{u.registrable_domain ?? (u.is_ip ? 'IP address' : 'n/a')}</span>
                </Row>
                <Row label="Hostname">{u.hostname}</Row>
                {u.unicode_hostname && <Row label="Displays as">{u.unicode_hostname}</Row>}
                <Row label="Subdomains">{u.subdomain ? `${u.subdomain} (${u.subdomain_count})` : 'none'}</Row>
                <Row label="Scheme">{u.scheme}</Row>
                <Row label="Path">{u.path}</Row>
                <Row label="Query">{u.has_query ? `${u.query_param_count} parameter${u.query_param_count === 1 ? '' : 's'}` : 'none'}</Row>
                <Row label="Structural flags">{u.findings.length ? u.findings.map((f) => f.name).join('; ') : 'none detected'}</Row>
              </dl>
              <p className="mt-2 text-xs text-slate-500">{u.note}</p>
            </>
          ) : (
            <p className="text-sm text-slate-600">Could not be parsed: {u.error}</p>
          )}
        </div>
      ))}
      <p className="text-xs text-slate-500">
        {reputation?.checked
          ? `Reputation checked with ${reputation.provider}: ${reputation.matches.length ? `${reputation.matches.length} match(es).` : 'no matches (this does not mean the URL is safe).'}`
          : 'No URL reputation service was consulted.'}
      </p>
    </div>
  );
}
