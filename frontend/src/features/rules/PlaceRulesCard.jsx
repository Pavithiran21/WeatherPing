import { IconAdjustmentsOff, IconPlus, IconRefresh } from '@tabler/icons-react';
import { RuleRow } from './RuleRow';

/**
 * The rules of one place, as a card: the dashboard's "Rules" card and each place's card
 * on the Rules page. heading is what the card's title shows.
 */
export function PlaceRulesCard({
  heading,
  headingId,
  place,
  rules,
  isPending,
  isError,
  onRetry,
  onNew,
  onEdit,
  onToggle,
  onDelete,
  busyRuleId = null,
  showActions = false,
  showEmptyButton = false,
  className = '',
}) {
  return (
    <section className={`box p-[22px] ${className}`} aria-labelledby={headingId}>
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="min-w-0 flex-1">{heading}</div>
        <button type="button" className="btn btn-coral btn-sm" onClick={() => onNew?.(place)}>
          <IconPlus size={18} aria-hidden="true" /> New<span className="sr-only"> rule for {place.name}</span>
        </button>
      </div>

      {isPending && (
        <div aria-label="Loading rules">
          <div className="skel" style={{ height: 64, borderRadius: 20 }} />
          <div className="skel" style={{ height: 64, borderRadius: 20 }} />
        </div>
      )}

      {isError && (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border-3 border-ink bg-coral-soft p-3">
          <p className="flex-1 text-[15px]">Couldn't load your rules.</p>
          <button type="button" className="btn btn-white btn-sm" onClick={onRetry}>
            <IconRefresh size={18} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {!isPending && !isError && rules.length === 0 && (
        <div className="rounded-[20px] border-3 border-dashed border-ink bg-cream p-[18px] text-center">
          <IconAdjustmentsOff size={34} className="mx-auto" aria-hidden="true" />
          <p className="font-display text-lg">No rules yet for {place.name}</p>
          <p className="mt-1 text-sm text-muted">Add one and we'll email you when the forecast matches.</p>
          {showEmptyButton && (
            <button type="button" className="btn btn-sun btn-sm mt-3" onClick={() => onNew?.(place)}>
              <IconPlus size={18} aria-hidden="true" /> New rule
            </button>
          )}
        </div>
      )}

      {!isPending && !isError && rules.length > 0 && (
        <ul>
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              placeName={place.name}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
              showActions={showActions}
              busy={busyRuleId === rule.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
