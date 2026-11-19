import { IconCloudOff, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router';
import { listAlerts } from '../../api/alerts';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { ErrorPanel, LoadingCard } from '../../components/StatePanels';
import { errorMessage } from '../../lib/apiErrors';
import { AddFirstSpotCard } from '../places/AddFirstSpotCard';
import { PlaceSheet } from '../places/PlaceSheet';
import { useForecast, useSelectedPlace } from '../places/placeQueries';
import { RemovePlaceDialog } from '../places/RemovePlaceDialog';
import { PlaceRulesCard } from '../rules/PlaceRulesCard';
import { RuleDialogs } from '../rules/RuleDialogs';
import { rulesForPlace, useRules } from '../rules/ruleQueries';
import { useRuleActions } from '../rules/useRuleActions';
import { CurrentWeatherCard } from './CurrentWeatherCard';
import { ForecastChart } from './ForecastChart';
import { NextPingCard } from './NextPingCard';
import { WeekStrip } from './WeekStrip';

// Enough recent alerts for one place to find the next ping and the 7-day bells: the
// evaluator only emails about today and tomorrow, so the newest 20 always include them.
const RECENT_ALERTS = 20;

/** Screen 5 (screen 13 on phone): the selected place's weather, next ping, chart, rules and week. */
export function DashboardPage() {
  const { openAddSpot } = useOutletContext();
  const { places, selected, isPending, isError, error, refetch } = useSelectedPlace();

  if (isPending) {
    return <LoadingCard label="Loading your spots…" />;
  }
  if (isError) {
    return <ErrorPanel icon={IconCloudOff} title="Couldn't load your spots" text={errorMessage(error)} onRetry={refetch} />;
  }
  if (places.length === 0) {
    return (
      <AddFirstSpotCard
        title="Add your first spot"
        text="Search a city, an area or paste coordinates."
        onAddSpot={openAddSpot}
      />
    );
  }
  // key: a new place starts with fresh state (an open dialog, a running countdown).
  return <PlaceDashboard key={selected.id} place={selected} places={places} onAddSpot={openAddSpot} />;
}

function PlaceDashboard({ place, places, onAddSpot }) {
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState(null); // 'places' (phone sheet) | 'remove' | null
  const closeDialog = () => setOpenDialog(null);
  const forecast = useForecast(place.id);
  const rules = useRules();
  const ruleActions = useRuleActions();
  const alertsFilter = { locationId: place.id, page: 1, size: RECENT_ALERTS };
  const alerts = useQuery({ queryKey: queryKeys.alerts(alertsFilter), queryFn: () => listAlerts(alertsFilter) });

  const placeRules = rulesForPlace(rules.data, place.id);
  const alertDates = useMemo(() => new Set((alerts.data?.items ?? []).map((alert) => alert.eventDate)), [alerts.data]);

  return (
    // Desktop: weather 7 | next ping 5, chart 7 | rules 5, week full width. "dense" lets
    // next ping and rules fill the right column although they come after the chart.
    <div className="grid grid-cols-12 gap-5 desk:grid-flow-row-dense">
      {forecast.isPending && <LoadingCard label="Loading forecast…" className="col-span-12 desk:col-span-7" />}

      {forecast.isError && (
        <ErrorPanel
          icon={IconCloudOff}
          className="col-span-12 desk:col-span-7"
          title="Couldn't load the forecast"
          text={
            forecast.error.code === 'WEATHER_SERVICE_UNAVAILABLE'
              ? "The weather service didn't answer. Your rules are safe."
              : errorMessage(forecast.error)
          }
          onRetry={() => forecast.refetch()}
        >
          {/* The weather card (with its trash button) is not shown, so a place whose
              forecast keeps failing can still be removed from here. */}
          <button type="button" className="btn btn-white" onClick={() => setOpenDialog('remove')}>
            <IconTrash size={20} aria-hidden="true" /> Remove this place
          </button>
        </ErrorPanel>
      )}

      {forecast.isSuccess && (
        <>
          <CurrentWeatherCard
            className="col-span-12 desk:col-span-7"
            place={place}
            forecast={forecast.data}
            onSwitchPlace={() => setOpenDialog('places')}
            onRemove={() => setOpenDialog('remove')}
          />
          <ForecastChart
            className="col-span-12 desk:col-span-7"
            hours={forecast.data.next24Hours}
            rules={placeRules}
            timeZone={user.timeZone}
          />
        </>
      )}

      {/* When the forecast fails, the next ping hides behind the same "Try again" panel. */}
      {!forecast.isError && (
        <NextPingCard
          className="col-span-12 tab:col-span-6 desk:col-span-5"
          alertsQuery={alerts}
          placeName={place.name}
          timeZone={user.timeZone}
        />
      )}

      <PlaceRulesCard
        className={forecast.isError ? 'col-span-12 desk:col-span-5' : 'col-span-12 tab:col-span-6 desk:col-span-5'}
        heading={
          <h3 id="place-rules-title" className="text-[22px]">
            Rules
          </h3>
        }
        headingId="place-rules-title"
        place={place}
        rules={placeRules}
        isPending={rules.isPending}
        isError={rules.isError}
        onRetry={() => rules.refetch()}
        showEmptyButton
        {...ruleActions.handlers}
      />

      {forecast.isSuccess && (
        <WeekStrip className="col-span-12" days={forecast.data.next7Days} alertDates={alertDates} />
      )}

      <PlaceSheet open={openDialog === 'places'} onClose={closeDialog} onAddSpot={onAddSpot} />
      <RemovePlaceDialog open={openDialog === 'remove'} onClose={closeDialog} place={place} ruleCount={placeRules.length} />
      <RuleDialogs {...ruleActions.dialogProps} places={places} />
    </div>
  );
}
