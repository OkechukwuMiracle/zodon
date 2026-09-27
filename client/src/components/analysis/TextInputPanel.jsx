import { ShieldAlert } from 'lucide-react';

export default function TextInputPanel({ value, onChange, onSubmit, maxChars, disabled }) {
  const trimmed = value.trim();
  const tooLong = value.length > maxChars;
  const tooShort = trimmed.length > 0 && trimmed.length < 5;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed || tooLong || tooShort) return;
        onSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="zodon-text" className="sr-only">
        Suspicious message or email
      </label>
      <textarea
        id="zodon-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste a suspicious message or email here..."
        rows={8}
        disabled={disabled}
        className="input min-h-44 resize-y font-mono text-[13px] leading-relaxed"
        aria-describedby="zodon-text-help"
        aria-invalid={tooLong || undefined}
      />
      <div id="zodon-text-help" className="flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500">
        <span className="flex items-start gap-1.5">
          <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          SMS, WhatsApp, email or social messages. Remove personal details you don&apos;t want analysed. Never paste passwords or codes.
        </span>
        <span className={`font-mono ${tooLong ? 'font-semibold text-red-600' : ''}`}>
          {value.length.toLocaleString()} / {maxChars.toLocaleString()}
        </span>
      </div>
      {tooLong && <p className="text-sm text-red-600">The message is too long. Trim it to {maxChars.toLocaleString()} characters.</p>}
      {tooShort && <p className="text-sm text-amber-700">The message is too short to analyse.</p>}
      <div>
        <button type="submit" className="btn-primary" disabled={disabled || !trimmed || tooLong || tooShort}>
          Analyze Message
        </button>
      </div>
    </form>
  );
}
