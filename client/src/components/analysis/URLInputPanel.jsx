import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { validateUrlInput } from '../../utils/validation.js';

export default function URLInputPanel({ value, onChange, onSubmit, disabled }) {
  const [touched, setTouched] = useState(false);
  const error = touched ? validateUrlInput(value) : null;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!validateUrlInput(value)) onSubmit();
      }}
    >
      <label htmlFor="zodon-url" className="text-sm font-medium text-slate-800">
        Suspicious URL
      </label>
      <input
        id="zodon-url"
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => value && setTouched(true)}
        placeholder="https://example.com/login"
        disabled={disabled}
        className="input font-mono text-[13px]"
        aria-invalid={error ? true : undefined}
        aria-describedby="zodon-url-help"
      />
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <p id="zodon-url-help" className="flex items-start gap-1.5 text-xs text-slate-500">
        <EyeOff className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Zodon does not visit this URL. It analyses the address structure only, which cannot establish on its own whether a site is malicious or safe.
      </p>
      <div>
        <button type="submit" className="btn-primary" disabled={disabled || !value.trim()}>
          Analyze URL
        </button>
      </div>
    </form>
  );
}
