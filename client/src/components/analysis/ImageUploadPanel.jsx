import { useEffect, useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { formatBytes } from '../../utils/format.js';
import { ACCEPTED_IMAGE_TYPES as ACCEPTED, validateImageFile } from '../../utils/validation.js';

export default function ImageUploadPanel({ file, onChange, onSubmit, maxMb, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    // Object URLs must be created from an effect so they can be revoked on change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreview(null);
    };
  }, [file]);

  const accept = (f) => {
    const problem = validateImageFile(f, maxMb);
    setError(problem);
    onChange(problem ? null : f);
  };

  return (
    <div className="flex flex-col gap-3">
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (disabled) return;
            const f = e.dataTransfer.files?.[0];
            if (f) accept(f);
          }}
          className={`flex min-h-44 flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
          }`}
        >
          <ImageUp className="mb-2 h-7 w-7 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-800">Drag and drop a screenshot here</p>
          <p className="mt-1 text-xs text-slate-500">PNG, JPG, JPEG or WEBP · up to {maxMb} MB</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => inputRef.current?.click()} disabled={disabled}>
            Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            aria-label="Upload screenshot"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) accept(f);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row">
          {preview && (
            <img src={preview} alt="Preview of the uploaded screenshot" className="max-h-64 w-full rounded border border-slate-200 bg-white object-contain sm:w-56" />
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
            <div className="text-sm">
              <div className="truncate font-medium text-slate-900" title={file.name}>{file.name}</div>
              <div className="text-xs text-slate-500">
                {file.type.replace('image/', '').toUpperCase()} · {formatBytes(file.size)}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                The image is sent to the server for analysis and is not stored. Crop out personal details you don&apos;t want analysed.
              </p>
            </div>
            <div>
              <button type="button" className="btn-ghost -ml-2 text-red-600 hover:text-red-700" onClick={() => onChange(null)} disabled={disabled}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove image
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div>
        <button type="button" className="btn-primary" onClick={onSubmit} disabled={disabled || !file}>
          Analyze Screenshot
        </button>
      </div>
    </div>
  );
}
