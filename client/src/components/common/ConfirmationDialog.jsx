import { useEffect, useRef } from 'react';

/** Accessible modal confirmation using the native <dialog> element (focus trap + Esc built in). */
export default function ConfirmationDialog({ open, title, description, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className="m-auto w-[min(92vw,420px)] rounded-md border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/40"
      aria-labelledby="confirm-title"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
        <button type="button" className="btn-secondary" onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
