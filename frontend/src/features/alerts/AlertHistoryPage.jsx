import { IconChevronLeft, IconChevronRight, IconMailCheck, IconMailbox, IconPlugConnectedX, IconRefresh } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { alertTitle, CONDITIONS } from '../../lib/conditions';
import { formatDayAndTime } from '../../lib/timeFormat';
import { useLocations } from '../places/placeQueries';
import { groupByWeek } from './alertGroups';
import { useAlertHistory, useMarkAllRead } from './alertQueries';

/**
 * Screen 7: every alert email sent, newest first, 20 per page, with one filter chip per place.
 * Opening the screen marks everything read (once the list has loaded, so the user saw it).
 */
export function AlertHistoryPage() {
  const { user } = useAuth();
  const [locationId, setLocationId] = useState(null);
  const [page, setPage] = useState(1);
  const locations = useLocations();
  const alerts = useAlertHistory({ locationId, page });

  const { mutate: markAllRead } = useMarkAllRead();
  const markedRead = useRef(false);
  useEffect(() => {
    if (alerts.isSuccess && !markedRead.current) {
      markedRead.current = true;
      markAllRead();
    }
  }, [alerts.isSuccess, markAllRead]);

  const places = locations.data ?? [];
  const selectedPlace = places.find((place) => place.id === locationId);

  function chooseFilter(id) {
    setLocationId(id);
    setPage(1);
  }

  function goToPage(next) {
    setPage(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <section className="box p-4 tab:p-7" aria-labelledby="alerts-title">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="alerts-title" className="flex-1 text-[32px]">
          Alert history
        </h2>
        {alerts.data?.totalItems > 0 && (
          <span className="tag bg-coral-soft">
            {alerts.data.totalItems} {alerts.data.totalItems === 1 ? 'ping' : 'pings'}
          </span>
        )}
      </div>

      <div className="mb-[18px] flex flex-wrap gap-2" role="group" aria-label="Show alerts for">
        <button type="button" className="chip" aria-pressed={locationId === null} onClick={() => chooseFilter(null)}>
          All
        </button>
        {places.map((place) => (
          <button
            key={place.id}
            type="button"
            className="chip"
            aria-pressed={locationId === place.id}
            onClick={() => chooseFilter(place.id)}
          >
            {place.name}
          </button>
        ))}
      </div>

      {alerts.isPending && <LoadingRows />}

      {alerts.isError && (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border-3 border-ink bg-coral-soft p-3" role="alert">
          <IconPlugConnectedX size={26} className="shrink-0" aria-hidden="true" />
          <p className="flex-1 text-[15px]">Couldn't load your alerts. Check your connection and try again.</p>
          <button type="button" className="btn btn-white btn-sm" onClick={() => alerts.refetch()}>
            <IconRefresh size={18} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {alerts.isSuccess && alerts.data.items.length === 0 && <EmptyHistory placeName={selectedPlace?.name} />}

      {alerts.isSuccess && alerts.data.items.length > 0 && (
        <>
          <div className={alerts.isPlaceholderData ? 'opacity-60' : ''} aria-busy={alerts.isPlaceholderData}>
            {groupByWeek(alerts.data.items, user.timeZone).map((group) => (
              <div key={group.label}>
                <h3 className="group-label">{group.label}</h3>
                <ul>
                  {group.items.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} timeZone={user.timeZone} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Pager
            page={page}
            totalPages={alerts.data.totalPages}
            busy={alerts.isPlaceholderData}
            onChange={goToPage}
          />
        </>
      )}
    </section>
  );
}

function AlertRow({ alert, timeZone }) {
  const condition = CONDITIONS[alert.condition];
  return (
    <li className="mb-3 flex items-center gap-3 rounded-[22px] border-3 border-ink bg-white p-3 last:mb-0 tab:gap-3.5 tab:p-3.5">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-2xl border-[2.5px] border-ink tab:size-[52px] ${condition.tint}`}
      >
        <condition.icon size={26} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <b className="block font-display text-[17px] font-semibold">{alertTitle(alert)}</b>
        <span className="text-[13px] text-muted">
          {alert.locationName} · emailed <time dateTime={alert.sentAt}>{formatDayAndTime(alert.sentAt, timeZone)}</time>
        </span>
      </div>
      {/* On phone the tag keeps only its icon, so the title has room; the word stays for screen readers. */}
      <span className="tag shrink-0 bg-mint-soft">
        <IconMailCheck size={16} aria-hidden="true" />
        <span className="sr-only tab:not-sr-only">Sent</span>
      </span>
    </li>
  );
}

function Pager({ page, totalPages, busy, onChange }) {
  if (totalPages <= 1) {
    return null;
  }
  const atFirst = page <= 1;
  const atLast = page >= totalPages;
  return (
    <div className="mt-3.5 flex items-center justify-between">
      <span className="font-display text-base" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <span className="flex gap-2.5">
        {/* The button you can use is yellow; one at the end of the list is white and faded. */}
        <button
          type="button"
          className={`icon-btn ${atFirst ? '' : 'bg-sun'}`}
          aria-label="Previous page"
          disabled={atFirst || busy}
          onClick={() => onChange(page - 1)}
        >
          <IconChevronLeft size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn ${atLast ? '' : 'bg-sun'}`}
          aria-label="Next page"
          disabled={atLast || busy}
          onClick={() => onChange(page + 1)}
        >
          <IconChevronRight size={20} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div aria-busy="true">
      <p className="font-display text-base">Loading your alerts…</p>
      <div className="skel" style={{ height: 64, borderRadius: 22 }} />
      <div className="skel" style={{ height: 64, borderRadius: 22 }} />
      <div className="skel" style={{ height: 64, borderRadius: 22 }} />
    </div>
  );
}

function EmptyHistory({ placeName }) {
  return (
    <div className="rounded-[20px] border-3 border-dashed border-ink bg-cream p-[18px] text-center">
      <IconMailbox size={34} className="mx-auto" aria-hidden="true" />
      <p className="font-display text-lg">{placeName ? `No alerts for ${placeName} yet` : 'No alerts yet'}</p>
      <p className="mt-1 text-sm text-muted">
        {placeName ? "We'll list every email we send for this place here." : "We'll list every email we send here."}
      </p>
    </div>
  );
}
