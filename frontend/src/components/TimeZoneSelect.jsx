import { IconAlertCircle, IconChevronDown, IconWorld } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useListboxKeys } from '../hooks/useListboxKeys';
import { filterTimeZones, listTimeZones, timeZoneLabel } from '../lib/timeZones';

/**
 * Searchable time zone list (ARIA combobox). Shows "Asia/Kolkata (UTC+05:30)" when closed;
 * typing filters the list. Use it with React Hook Form's <Controller>.
 */
export function TimeZoneSelect({ id, label, value, onChange, onBlur, error, hint, ref }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const options = useMemo(() => (isOpen ? filterTimeZones(query) : []), [isOpen, query]);

  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const optionId = (index) => `${id}-option-${index}`;

  const { activeIndex, setActiveIndex, onKeyDown } = useListboxKeys({
    optionCount: options.length,
    isOpen,
    onPick: (index) => pick(options[index].name),
    onClose: () => setIsOpen(false),
  });

  // Keep the highlighted option in view while moving with the arrow keys.
  useEffect(() => {
    if (activeIndex >= 0) {
      document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
    }
  });

  function open() {
    if (isOpen) return;
    setQuery('');
    setIsOpen(true);
    setActiveIndex(listTimeZones().findIndex((zone) => zone.name === value));
  }

  function pick(zone) {
    onChange(zone);
    setIsOpen(false);
  }

  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="mb-[18px]">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="input-wrap">
        <IconWorld size={20} className="input-icon" aria-hidden="true" />
        <input
          id={id}
          ref={ref}
          className="input pr-12"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={isOpen ? query : timeZoneLabel(value)}
          placeholder={isOpen ? 'Type a city, like Kolkata' : undefined}
          onFocus={open}
          onClick={open}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setIsOpen(false);
            onBlur?.();
          }}
        />
        <IconChevronDown size={20} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" aria-hidden="true" />
      </div>
      {isOpen && (
        <ul id={listId} role="listbox" aria-label={`${label} list`} className="menu">
          {options.length === 0 && <li className="px-3.5 py-2.5 text-sm text-muted">No time zone matches that.</li>}
          {options.map((zone, index) => (
            <li
              key={zone.name}
              id={optionId(index)}
              role="option"
              aria-selected={zone.name === value}
              data-active={index === activeIndex}
              // mousedown would move focus out of the input and close the list before the click.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(zone.name)}
            >
              <span className={zone.name === value ? 'font-extrabold' : undefined}>{zone.name.replaceAll('_', ' ')}</span>
              <span className="text-muted">{zone.offset}</span>
            </li>
          ))}
        </ul>
      )}
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
