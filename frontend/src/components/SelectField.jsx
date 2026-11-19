import { IconAlertCircle, IconChevronDown } from '@tabler/icons-react';

/**
 * A native <select> in the same style as TextField: label, icon, error and hint.
 * Works with React Hook Form: spread register('field') into it.
 * Two selects that share one error (From and To) pass invalid and describedBy instead of error.
 */
export function SelectField({
  id,
  label,
  icon: Icon,
  error,
  hint,
  invalid = false,
  describedBy,
  children,
  className = 'mb-[18px]',
  ...selectProps
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedByIds = [describedBy, error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="input-wrap">
        <Icon size={20} className="input-icon" aria-hidden="true" />
        <select
          id={id}
          className="input appearance-none pr-12"
          aria-invalid={error || invalid ? true : undefined}
          aria-describedby={describedByIds}
          {...selectProps}
        >
          {children}
        </select>
        <IconChevronDown size={20} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" aria-hidden="true" />
      </div>
      {error && (
        <p id={errorId} className="field-error">
          <IconAlertCircle size={18} aria-hidden="true" /> {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}
