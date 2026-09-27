import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquareText, Image as ImageIcon, Link2, FlaskConical, ChevronDown, X } from 'lucide-react';
import { useInvestigation } from '../../hooks/InvestigationContext.jsx';
import { useSamples } from '../../hooks/useSamples.js';
import TextInputPanel from './TextInputPanel.jsx';
import ImageUploadPanel from './ImageUploadPanel.jsx';
import URLInputPanel from './URLInputPanel.jsx';
import AnalysisProgress from './AnalysisProgress.jsx';
import ErrorState from '../common/ErrorState.jsx';
import ProcessingNotice from './ProcessingNotice.jsx';

const TABS = [
  { id: 'text', label: 'Message', icon: MessageSquareText },
  { id: 'image', label: 'Screenshot', icon: ImageIcon },
  { id: 'url', label: 'URL', icon: Link2 },
];

const AI_ERROR_TITLES = {
  AI_UNAVAILABLE: 'Live AI analysis is unavailable',
  AI_AUTH_FAILED: 'AI provider rejected the API key',
  AI_MODEL_UNAVAILABLE: 'AI model unavailable',
  AI_RATE_LIMITED: 'AI rate limit reached',
  AI_TIMEOUT: 'AI analysis timed out',
  AI_INVALID_OUTPUT: 'AI returned an invalid response',
  AI_UPSTREAM_ERROR: 'AI provider error',
  AI_BLOCKED: 'AI declined to analyse this content',
  RATE_LIMITED: 'Too many requests',
  NETWORK_ERROR: 'Cannot reach the Zodon server',
  NETWORK_TIMEOUT: 'Request timed out',
  FILE_TOO_LARGE: 'Image too large',
  UNSUPPORTED_FILE: 'Unsupported file',
  INVALID_URL: 'Invalid URL',
  VALIDATION_ERROR: 'Please check your input',
};

function SamplePicker({ onPick }) {
  const { samples, error, loading } = useSamples();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn-secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" disabled={loading || !!error}>
        <FlaskConical className="h-4 w-4 text-blue-600" aria-hidden="true" />
        Try a Sample Investigation
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {error && <p className="mt-1 text-xs text-slate-500">Samples unavailable while the server is offline.</p>}
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-[min(92vw,360px)] rounded-md border border-slate-200 bg-white py-1 shadow-lg sm:left-0 sm:right-auto">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wide text-amber-700 uppercase">Synthetic samples · fictional content</div>
          {samples.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              onClick={() => {
                setOpen(false);
                onPick(s);
              }}
            >
              <div className="text-sm font-medium text-slate-900">{s.title}</div>
              <div className="text-xs text-slate-500">
                {s.input_type === 'url' ? 'URL' : 'Message'} · Expected: {s.expected}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvestigationInput({ initialSampleId = null }) {
  const navigate = useNavigate();
  const { run, investigate, cancel, resetRun, openPartialReport, health } = useInvestigation();
  const { samples } = useSamples();
  const [tab, setTab] = useState('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [sample, setSample] = useState(null); // currently loaded synthetic sample
  const appliedInitial = useRef(false);

  const limits = health.data?.limits ?? { max_upload_mb: 5, max_text_chars: 10000 };
  const aiConfigured = health.data?.ai?.configured;
  const running = run.status === 'running';

  const loadSample = (s) => {
    resetRun();
    setSample(s);
    if (s.input_type === 'url') {
      setTab('url');
      setUrl(s.content);
    } else {
      setTab('text');
      setText(s.content);
    }
  };

  useEffect(() => {
    if (appliedInitial.current || !initialSampleId || !samples.length) return;
    const s = samples.find((x) => x.id === initialSampleId);
    if (s) {
      appliedInitial.current = true;
      // Applying a sample chosen on another page once samples have loaded.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSample(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSampleId, samples]);

  // If the user edits sample content, it is no longer the sample.
  useEffect(() => {
    if (!sample) return;
    const current = sample.input_type === 'url' ? url : text;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current !== sample.content) setSample(null);
  }, [text, url, sample]);

  const go = async (input) => {
    const report = await investigate(input);
    if (report) navigate(`/report/${report.id}`);
  };

  const runSampleDemo = () => sample && go({ type: 'sample', sampleId: sample.id });

  const err = run.status === 'error' ? run.error : null;
  const isAiError = err?.code?.startsWith('AI_');

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 pt-3 sm:px-5">
        <div role="tablist" aria-label="Input type" className="-mb-px flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => {
                setTab(id);
                resetRun();
              }}
              disabled={running}
              className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <div className="pb-3">
          <SamplePicker onPick={loadSample} />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {sample && !running && (
          <div className="mb-4 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm sm:flex-row sm:items-center">
            <div className="flex-1 text-amber-900">
              <span className="mr-2 rounded bg-amber-200/70 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">Synthetic sample</span>
              <span className="font-medium">{sample.title}.</span> Fictional content for demonstration.{' '}
              {aiConfigured ? 'Analyze it live with Gemini, or view the pre-written illustrative analysis.' : 'AI is not configured, so you can view the pre-written illustrative analysis.'}
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={runSampleDemo}>
                View illustrative analysis
              </button>
              <button type="button" className="btn-ghost p-2" aria-label="Clear sample" onClick={() => { setSample(null); setText(''); setUrl(''); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {running ? (
          <AnalysisProgress key={run.inputType} inputType={run.inputType} onCancel={cancel} />
        ) : (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'text' && (
              <TextInputPanel value={text} onChange={setText} maxChars={limits.max_text_chars} onSubmit={() => go({ type: 'text', text })} disabled={running} />
            )}
            {tab === 'image' && (
              <ImageUploadPanel file={file} onChange={(f) => { setFile(f); resetRun(); }} maxMb={limits.max_upload_mb} onSubmit={() => go({ type: 'image', file })} disabled={running} />
            )}
            {tab === 'url' && <URLInputPanel value={url} onChange={setUrl} onSubmit={() => go({ type: 'url', url })} disabled={running} />}
            <ProcessingNotice />
          </div>
        )}

        {err && (
          <div className="mt-4">
            <ErrorState title={AI_ERROR_TITLES[err.code] ?? 'Analysis failed'} message={err.message} code={err.code}>
              {run.partialReport && (
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    const r = openPartialReport();
                    if (r) navigate(`/report/${r.id}`);
                  }}
                >
                  View rule-based checks only
                </button>
              )}
              {isAiError && sample && (
                <button type="button" className="btn-secondary text-xs" onClick={runSampleDemo}>
                  View illustrative sample analysis
                </button>
              )}
              {isAiError && !sample && (
                <span className="self-center text-xs text-red-800">You can still explore Zodon with a synthetic sample (above).</span>
              )}
              {['AI_TIMEOUT', 'AI_UPSTREAM_ERROR', 'AI_INVALID_OUTPUT', 'NETWORK_ERROR', 'NETWORK_TIMEOUT', 'AI_RATE_LIMITED'].includes(err.code) && (
                <button type="button" className="btn-secondary text-xs" onClick={() => go(tab === 'text' ? { type: 'text', text } : tab === 'url' ? { type: 'url', url } : { type: 'image', file })}>
                  Try again
                </button>
              )}
            </ErrorState>
            {run.partialReport && (
              <p className="mt-2 text-xs text-slate-500">
                Rule-based checks are deterministic pattern checks. They are shown separately and are not a complete AI investigation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
