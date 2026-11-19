import { DateTime } from 'luxon';

/**
 * Splits one page of alerts (newest first) into "This week" and "Earlier" for Alert history.
 * The week starts on Monday at midnight in the user's time zone, so the split follows the
 * user's own calendar, not the server's UTC one. Empty groups are left out.
 */
export function groupByWeek(alerts, timeZone, now = DateTime.now()) {
  const weekStart = now.setZone(timeZone).startOf('week');
  const thisWeek = [];
  const earlier = [];

  for (const alert of alerts) {
    if (DateTime.fromISO(alert.sentAt) >= weekStart) {
      thisWeek.push(alert);
    } else {
      earlier.push(alert);
    }
  }

  return [
    { label: 'This week', items: thisWeek },
    { label: 'Earlier', items: earlier },
  ].filter((group) => group.items.length > 0);
}
