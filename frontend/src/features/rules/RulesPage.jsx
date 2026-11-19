import { IconMailFast, IconMapPin, IconPlugConnectedX, IconPlus } from '@tabler/icons-react';
import { useOutletContext } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { ErrorPanel, LoadingCard } from '../../components/StatePanels';
import { AddFirstSpotCard } from '../places/AddFirstSpotCard';
import { useLocations } from '../places/placeQueries';
import { PlaceRulesCard } from './PlaceRulesCard';
import { RuleDialogs } from './RuleDialogs';
import { rulesForPlace, useRules } from './ruleQueries';
import { useRuleActions } from './useRuleActions';

/** Screen 18: every rule, grouped by place, with pause/resume, edit and delete. */
export function RulesPage() {
  const { openAddSpot } = useOutletContext();
  const locations = useLocations();
  const rules = useRules();
  const ruleActions = useRuleActions();

  if (locations.isPending || rules.isPending) {
    return <LoadingCard label="Loading your rules…" />;
  }
  if (locations.isError || rules.isError) {
    return (
      <ErrorPanel
        icon={IconPlugConnectedX}
        title="Couldn't load your rules"
        text="Check your connection and try again. Nothing was changed."
        onRetry={() => {
          locations.refetch();
          rules.refetch();
        }}
      />
    );
  }

  const places = locations.data;
  if (places.length === 0) {
    return (
      <AddFirstSpotCard
        title="Add a spot first"
        text="A rule watches one of your places. Add a place, then pick what to watch."
        onAddSpot={openAddSpot}
      />
    );
  }

  const allRules = rules.data;
  const pausedCount = allRules.filter((rule) => rule.status === 'paused').length;

  return (
    <section aria-labelledby="rules-title">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 id="rules-title" className="flex-1 text-[32px]">
          Rules
        </h2>
        <span className="tag bg-coral-soft">
          {allRules.length} {allRules.length === 1 ? 'rule' : 'rules'}
          {pausedCount > 0 && ` · ${pausedCount} paused`}
        </span>
        <button type="button" className="btn btn-sun" onClick={() => ruleActions.handlers.onNew(null)}>
          <IconPlus size={20} aria-hidden="true" /> New rule
        </button>
      </div>

      <div className="grid items-start gap-5 desk:grid-cols-2">
        {places.map((place) => (
          <PlaceRulesCard
            key={place.id}
            heading={<PlaceHeading place={place} />}
            headingId={`rules-place-${place.id}`}
            place={place}
            rules={rulesForPlace(allRules, place.id)}
            isPending={false}
            isError={false}
            showActions
            {...ruleActions.handlers}
          />
        ))}
        <HowRulesWork />
      </div>

      <RuleDialogs {...ruleActions.dialogProps} places={places} />
    </section>
  );
}

function PlaceHeading({ place }) {
  const area = [place.region, place.country].filter(Boolean).join(', ');
  return (
    <h3 id={`rules-place-${place.id}`} className="flex min-w-0 items-center gap-2 text-[22px]">
      <IconMapPin size={26} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{place.name}</span>
      {area && <span className="hidden truncate font-body text-[13px] text-muted tab:inline">{area}</span>}
    </h3>
  );
}

function HowRulesWork() {
  const { user } = useAuth();
  return (
    <aside className="flex items-start gap-3 rounded-[28px] border-3 border-dashed border-ink bg-mint-soft p-[22px]">
      <IconMailFast size={30} className="shrink-0" aria-hidden="true" />
      <div className="text-[15px] leading-relaxed">
        <p className="font-display text-lg">How rules work</p>
        Each rule sends <b>one email per event</b>. Pausing keeps the rule so you can turn it back on; deleting it keeps
        its past alerts in your history. Times are in {user.timeZone}.
      </div>
    </aside>
  );
}
