import { Eye, Sparkles, HelpCircle } from 'lucide-react';

export const KIND_META = {
  observed: { label: 'Observed', icon: Eye, chip: 'bg-slate-900 text-white', border: 'border-l-slate-900' },
  interpretation: { label: 'AI interpretation', icon: Sparkles, chip: 'bg-blue-50 text-blue-800 border border-blue-200', border: 'border-l-blue-400' },
  assumption: { label: 'Unverified assumption', icon: HelpCircle, chip: 'bg-slate-100 text-slate-600 border border-dashed border-slate-300', border: 'border-l-slate-300' },
};
