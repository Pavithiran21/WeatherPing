import { DateTime } from 'luxon';
import { formatClock } from '../../lib/timeFormat';

// The "Next ping" card (UI-UX.md screen 5) shows the soonest alert that was already
// emailed for this place and whose window hasn't ended. The evaluator emails at the first
// check that sees the forecast (up to a day ahead), so this is what really happens next.
// Plain functions with "now" passed in, so they are easy to test.

/** An alert's window as Luxon DateTimes. Windows and eventDate are in the user's time zone. */
export function alertWindow(alert, timeZone) {
  return {
    start: DateTime.fromISO(`${alert.eventDate}T${alert.windowStart}`, { zone: timeZone }),
    end: DateTime.fromISO(`${alert.eventDate}T${alert.windowEnd}`, { zone: timeZone }),
  };
}

/** { alert, start, end } for the soonest window that hasn't ended, or null. */
export function findNextPing(alerts, timeZone, now) {
  let next = null;
  for (const alert of alerts) {
    const { start, end } = alertWindow(alert, timeZone);
    if (end > now && (next === null || start < next.start)) {
      next = { alert, start, end };
    }
  }
  return next;
}

/** Whole hours and minutes until start; both 0 once it has started. */
export function timeUntil(start, now) {
  const totalMinutes = Math.max(0, Math.floor(start.diff(now, 'minutes').minutes));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** "today", "tomorrow", "yesterday" or "on Sat 25 Oct". Both dates must be in the same time zone. */
export function dayWords(date, now) {
  const days = Math.round(date.startOf('day').diff(now.startOf('day'), 'days').days);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return `on ${date.toFormat('ccc d LLL')}`;
}

/** When the email went out: "at 12:30 pm", "yesterday at 7 pm" or "on Sun 19 Oct at 7 pm". */
export function sentWords(sentAt, timeZone, now) {
  const clock = formatClock(sentAt, timeZone);
  const day = dayWords(DateTime.fromISO(sentAt).setZone(timeZone), now);
  return day === 'today' ? `at ${clock}` : `${day} at ${clock}`;
}
