import { IconBellRinging, IconRefresh } from '@tabler/icons-react';
import { CONDITIONS } from '../../lib/conditions';
import { formatTime, windowInWords } from '../../lib/timeFormat';
import { useNow } from '../../hooks/useNow';
import { dayWords, findNextPing, sentWords, timeUntil } from './nextPing';

/** "Next ping": the soonest alert already emailed for this place (see nextPing.js). */
export function NextPingCard({ alertsQuery, placeName, timeZone, className = '' }) {
  const now = useNow().setZone(timeZone);
  const next = alertsQuery.data ? findNextPing(alertsQuery.data.items, timeZone, now) : null;
  const condition = next ? CONDITIONS[next.alert.condition] : null;

  return (
    <section className={`box bg-coral p-[22px] ${className}`} aria-labelledby="next-ping-title">
      <div className="mb-3.5 flex items-center gap-2.5">
        <IconBellRinging size={34} aria-hidden="true" />
        <h3 id="next-ping-title" className="flex-1 text-[22px]">
          Next ping
        </h3>
        {condition && <span className="tag bg-sun">{condition.label} rule</span>}
      </div>

      {alertsQuery.isPending && (
        <div aria-label="Loading the next ping">
          <div className="skel" style={{ height: 56 }} />
          <div className="skel w-4/5" />
        </div>
      )}

      {alertsQuery.isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-[15px]">Couldn't load your pings.</p>
          <button type="button" className="btn btn-white btn-sm" onClick={() => alertsQuery.refetch()}>
            <IconRefresh size={18} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {alertsQuery.isSuccess && !next && (
        <p className="text-base leading-normal">
          No pings coming up. We'll email you when one of your rules matches the forecast.
        </p>
      )}

      {next && <PingDetails next={next} condition={condition} placeName={placeName} timeZone={timeZone} now={now} />}
    </section>
  );
}

function PingDetails({ next, condition, placeName, timeZone, now }) {
  const { alert, start } = next;
  const started = now >= start;
  const { hours, minutes } = timeUntil(start, now);
  const fact = condition.fact(alert.forecastValue);

  return (
    <>
      <div className="my-4 grid grid-cols-3 gap-2.5">
        {started ? (
          <CountTile className="col-span-2" value="Now" label={`until ${formatTime(alert.windowEnd)}`} />
        ) : (
          <>
            <CountTile value={hours} label={hours === 1 ? 'hour' : 'hours'} />
            <CountTile value={minutes} label={minutes === 1 ? 'min' : 'mins'} />
          </>
        )}
        <CountTile value={fact.value} label={fact.label} />
      </div>
      <p className="text-base leading-normal">
        {condition.headline} <b>{windowInWords(alert.windowStart, alert.windowEnd)}</b> {dayWords(start, now)} in{' '}
        {placeName}. We emailed you <b>once</b> {sentWords(alert.sentAt, timeZone, now)} and won't repeat it, even when
        the check runs again.
      </p>
    </>
  );
}

function CountTile({ value, label, className = '' }) {
  return (
    <div className={`rounded-[18px] border-3 border-ink bg-white px-1.5 py-2.5 text-center shadow-pop-sm ${className}`}>
      <b className="block font-display text-[38px] leading-none font-bold">{value}</b>
      <small className="text-xs text-muted">{label}</small>
    </div>
  );
}
