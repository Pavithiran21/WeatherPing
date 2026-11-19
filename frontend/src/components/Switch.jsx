/**
 * An on/off switch (role="switch"). The label names the thing it turns on and off, for
 * example "Rain rule in Chennai"; screen readers add "on" or "off" from aria-checked.
 */
export function Switch({ checked, label, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="switch"
      onClick={() => onChange?.(!checked)}
    />
  );
}
