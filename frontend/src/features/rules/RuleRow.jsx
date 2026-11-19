import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Switch } from '../../components/Switch';
import { CONDITIONS, ruleDetails } from '../../lib/conditions';

/**
 * One rule: condition icon, name, "7–9 am · 60%+ chance" and its on/off switch.
 * On the dashboard the name opens the edit dialog. With showActions (Rules page) the row
 * has pencil and trash buttons instead; on phone they move to their own line under the rule.
 */
export function RuleRow({ rule, placeName, onEdit, onToggle, onDelete, showActions = false, busy = false }) {
  const condition = CONDITIONS[rule.condition];
  const paused = rule.status === 'paused';
  const ruleName = `${condition.label} rule in ${placeName}`;

  return (
    <li
      className={`mb-3 flex flex-wrap items-center gap-3 rounded-[20px] border-3 border-ink p-3 last:mb-0 tab:flex-nowrap ${
        paused ? 'bg-mist-soft' : 'bg-white'
      }`}
    >
      <span
        className={`grid size-[50px] shrink-0 place-items-center rounded-2xl border-[2.5px] border-ink ${
          paused ? 'bg-mist' : condition.tint
        }`}
      >
        <condition.icon size={26} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        {showActions ? (
          <b className="block font-display text-lg font-semibold">{condition.label}</b>
        ) : (
          <button
            type="button"
            className="block text-left font-display text-lg hover:underline"
            aria-label={`Edit ${ruleName}`}
            onClick={() => onEdit?.(rule)}
          >
            {condition.label}
          </button>
        )}
        <span className="text-[13px] text-muted">{ruleDetails(rule)}</span>
      </div>
      <Switch checked={!paused} label={ruleName} disabled={busy} onChange={() => onToggle?.(rule)} />
      {showActions && (
        <div className="flex w-full justify-end gap-2 tab:w-auto">
          <button type="button" className="icon-btn size-[38px] rounded-[14px]" aria-label={`Edit ${ruleName}`} onClick={() => onEdit?.(rule)}>
            <IconPencil size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn size-[38px] rounded-[14px]"
            aria-label={`Delete ${ruleName}`}
            onClick={() => onDelete?.(rule)}
          >
            <IconTrash size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}
