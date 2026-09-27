import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import InvestigationInput from '../components/analysis/InvestigationInput.jsx';

export default function Investigation() {
  const [params] = useSearchParams();
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">New investigation</h2>
        <p className="mt-1 text-sm text-slate-600">
          Submit a suspicious message, screenshot or URL. Zodon combines deterministic security checks with Gemini AI analysis and shows you exactly which is which.
        </p>
      </div>
      <InvestigationInput initialSampleId={params.get('sample')} />
      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <p>
          <span className="font-medium text-slate-800">Privacy:</span> submissions are sent to the Zodon server and, when AI analysis is enabled, to Google&apos;s Gemini API.
          Zodon does not store them on its server. Links are never visited. Saved history keeps findings only—not the original message or screenshot. Do not submit passwords, one-time codes
          or banking credentials.
        </p>
      </div>
    </div>
  );
}
