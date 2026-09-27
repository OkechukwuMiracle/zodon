import { Lock } from 'lucide-react';
import { useInvestigation } from '../../hooks/InvestigationContext.jsx';

/** Plain-language disclosure of where submitted content goes, based on live server status. */
export default function ProcessingNotice() {
  const { health } = useInvestigation();
  const ai = health.data?.ai;
  let where;
  if (health.status !== 'ok') where = 'The Zodon server is not reachable, so nothing can be analysed right now.';
  else if (ai?.configured) where = `When you click Analyze, your content is sent to the Zodon server and to ${ai.provider} (${ai.model}) for analysis.`;
  else where = 'AI analysis is switched off on this server: content is only checked by Zodon\'s rule engine and is not sent to an external AI provider.';

  return (
    <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
      <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {where} Zodon does not store submissions on its server or visit links. Never submit passwords, one-time codes, PINs, private keys or recovery phrases—Zodon will never ask for them.
      </span>
    </p>
  );
}
