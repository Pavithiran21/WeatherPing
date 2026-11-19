import { IconAlertCircle } from '@tabler/icons-react';
import { useId } from 'react';

/**
 * Label, icon, input, error and hint, wired for screen readers: the error and hint
 * are linked with aria-describedby and an error sets aria-invalid (UI-UX.md "Labels").
 * Works with React Hook Form: spread register('field') into it (ref is a normal prop in React 19).
 * trailing goes inside the box on the right (a spinner); children go under the box (a results list).
 */
export function TextField({ label, icon: Icon, error, hint, id, trailing, children, className = 'mb-[18px]', ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="input-wrap">
        <Icon size={20} className="input-icon" aria-hidden="true" />
        <input
          id={inputId}
          className="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {trailing && <span className="absolute top-1/2 right-4 -translate-y-1/2">{trailing}</span>}
      </div>
      {children}
      {error && (
        <p id={errorId} className="field-error">
          <IconAlertCircle size={18} aria-hidden="true" /> {error}
        </p>
      )}
      {hint && (
        <div id={hintId} className="hint">
          {hint}
        </div>
      )}
    </div>
  );
}
