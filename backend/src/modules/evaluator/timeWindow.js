const { DateTime } = require('luxon');

// "07:30" on a given local day, as a Luxon DateTime in that day's zone.
function atTimeOfDay(day, hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

/**
 * The rule's windows that can still produce an alert: today's and tomorrow's,
 * in the user's time zone, minus any window that has already ended.
 *
 * Each window has eventKey = its local date ("2026-10-21"). One rule can alert at most
 * once per eventKey, which is what "one email per rule per event" means.
 * Only today and tomorrow are checked: forecasts further out change too much to email about.
 *
 * Returns [{ eventKey, start, end }] with start and end as UTC Dates.
 */
function upcomingWindows(rule, timeZone, now) {
  const today = DateTime.fromJSDate(now, { zone: timeZone }).startOf('day');

  return [today, today.plus({ days: 1 })]
    .map((day) => ({
      eventKey: day.toISODate(),
      start: atTimeOfDay(day, rule.windowStart).toJSDate(),
      end: atTimeOfDay(day, rule.windowEnd).toJSDate(),
    }))
    .filter((window) => window.end > now);
}

module.exports = { upcomingWindows };
