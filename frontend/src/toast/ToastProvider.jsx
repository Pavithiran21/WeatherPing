import { IconCheck, IconWifiOff, IconX } from '@tabler/icons-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './ToastContext';

const SUCCESS_MS = 4000;

// Background of the small icon tile, as in the design's toasts.
const TONES = {
  mint: 'bg-mint',
  sun: 'bg-sun',
  sky: 'bg-sky-soft',
  coral: 'bg-coral',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }]);
      if (toast.kind === 'success') {
        setTimeout(() => dismiss(id), SUCCESS_MS);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message, { icon = IconCheck, tone = 'mint', action } = {}) =>
        show({ kind: 'success', message, icon, tone, action }),
      // A null message (see lib/apiErrors.js errorMessage) shows nothing.
      error: (message) => message && show({ kind: 'error', message, icon: IconWifiOff, tone: 'coral' }),
      dismiss,
    }),
    [show, dismiss],
  );

  const successes = toasts.filter((toast) => toast.kind === 'success');
  const errors = toasts.filter((toast) => toast.kind === 'error');

  return (
    <ToastContext value={api}>
      {children}
      {/* Both regions are always in the page, so screen readers announce what is added to them. */}
      <div className="pointer-events-none fixed right-4 bottom-24 left-4 z-50 flex flex-col items-end gap-3 tab:bottom-6 tab:left-auto">
        <div role="alert" className="flex w-full flex-col items-end gap-3">
          {errors.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </div>
        <div role="status" className="flex w-full flex-col items-end gap-3">
          {successes.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </div>
      </div>
    </ToastContext>
  );
}

function ToastCard({ toast, onDismiss }) {
  const Icon = toast.icon;
  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[18px] border-3 border-ink px-4 py-3 font-display text-base shadow-pop-sm ${
        toast.kind === 'error' ? 'bg-coral-soft' : 'bg-white'
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl border-[2.5px] border-ink ${TONES[toast.tone]}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="flex-1">
        {toast.message}
        {toast.action && (
          <>
            {' · '}
            <button
              type="button"
              className="link"
              onClick={() => {
                toast.action.onClick();
                onDismiss();
              }}
            >
              {toast.action.label}
            </button>
          </>
        )}
      </span>
      <button type="button" className="grid size-8 place-items-center rounded-lg" aria-label="Dismiss" onClick={onDismiss}>
        <IconX size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
