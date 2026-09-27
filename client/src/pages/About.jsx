import { Eye, Sparkles, HelpCircle, Scale, Lock, AlertTriangle } from 'lucide-react';
import { useInvestigation } from '../hooks/InvestigationContext.jsx';

function Block({ icon: Icon, title, children }) {
  return (
    <section className="card p-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" /> {title}
      </h3>
      <div className="space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export default function About() {
  const { health } = useInvestigation();
  const ai = health.data?.ai;
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">About Zodon</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Zodon helps individuals, students, professionals and small businesses investigate suspicious messages, emails, URLs and screenshots. It is an
          evidence-based security assistant—not a chatbot—and it separates what it observed from what it infers.
        </p>
      </div>

      <section className="card p-5" aria-labelledby="status-title">
        <h3 id="status-title" className="mb-3 text-sm font-semibold text-slate-900">Feature status on this server</h3>
        {health.status !== 'ok' ? (
          <p className="text-sm text-slate-600">Server status unavailable.</p>
        ) : (
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              ['Rule-based text and URL checks', true, 'Always on'],
              ['Live AI analysis (Gemini)', ai?.configured, ai?.configured ? `${ai.model}${ai.fallback_model ? ` · fallback ${ai.fallback_model}` : ''}` : 'Not configured: samples and rule checks only'],
              ['Screenshot analysis', ai?.configured, ai?.configured ? 'Uses the AI model to read the image' : 'Requires AI'],
              ['URL reputation lookup', health.data.reputation?.configured, health.data.reputation?.configured ? health.data.reputation.provider : 'Not configured: URL findings are structural only'],
              ['Synthetic demo samples', true, 'Clearly labelled; not live results'],
              ['Investigation history', true, 'This browser only'],
            ].map(([name, on, detail]) => (
              <li key={name} className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />
                <span>
                  <span className="font-medium text-slate-800">{name}</span>
                  <span className="sr-only">{on ? ' (available)' : ' (unavailable)'}</span>
                  <span className="block text-xs text-slate-500">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Block icon={Eye} title="Observed evidence">
          <p>Deterministic, rule-based checks look for credential and payment requests, urgency, impersonation, risky attachments and deceptive URL structures (lookalike domains, embedded domains, IP hosts, punycode, shorteners).</p>
          <p>AI findings count as observed only when the quoted excerpt is actually found in your submission.</p>
        </Block>
        <Block icon={Sparkles} title="AI interpretation">
          <p>
            Google Gemini {ai?.configured ? <>(<span className="font-mono text-xs">{ai.model}</span>)</> : ''} reads the content and the rule results, then explains likely intent, plausible next steps and
            recommended actions. Submitted content is treated as untrusted data; instructions inside it are ignored.
          </p>
        </Block>
        <Block icon={Scale} title="How severity is decided">
          <p>Severity is calibrated against observed evidence. Duplicate indicators count once, weak signals alone cannot produce a high rating, and the AI can move the evidence-based level by at most one step.</p>
          <p>Severity, AI confidence and evidence strength are reported separately—they are not the same thing.</p>
        </Block>
        <Block icon={HelpCircle} title="Inconclusive is a valid answer">
          <p>When evidence is thin, Zodon says so instead of guessing, and tells you what information is missing.</p>
          <p>Names, languages and dialects (including Pidgin, Yoruba, Igbo and Hausa), naira amounts and local bank or payment references are never treated as evidence on their own. Zodon looks at behaviour: requests for secrets, changed bank details, deceptive links and pressure.</p>
        </Block>
        <Block icon={Scale} title="Built for small businesses">
          <p>Zodon recognises supplier impersonation, changed bank details on invoices, executive "urgent transfer" requests and overpayment-refund scams, and explains which business process is at risk and what to verify independently.</p>
          <p>Zodon only advises. It never contacts anyone, blocks payments or acts on your accounts; decisions stay with you.</p>
        </Block>
        <Block icon={Lock} title="Privacy">
          <p>API keys stay on the server. Links are never visited and attachments are never opened. Submissions are processed in memory and not stored by Zodon; history in your browser keeps findings only.</p>
          <p>Never enter passwords, one-time codes, recovery codes or banking credentials into Zodon.</p>
        </Block>
        <Block icon={AlertTriangle} title="Limitations">
          <p>Zodon provides a risk assessment, not a confirmed incident determination, and cannot guarantee protection. It does not verify senders, check domain registration age, or scan files. URL reputation is only checked when a reputation service is configured on the server.</p>
        </Block>
      </div>
    </div>
  );
}
