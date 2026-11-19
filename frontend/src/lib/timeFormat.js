import { DateTime } from 'luxon';

// Rule windows are stored as 24-hour "HH:mm" strings and shown the way the approved design
// writes them: 12-hour, with "am"/"pm" said once when both ends share it.
// Same rules as backend/src/modules/rules/timeFormat.js, so the app and the emails agree.

function toParts(hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  return { hour, minute, meridiem: hour < 12 ? 'am' : 'pm' };
}

// "07:00" -> "7", "07:30" -> "7:30", "12:00" -> "12", "00:00" -> "12"
function clock({ hour, minute }) {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${hour12}` : `${hour12}:${String(minute).padStart(2, '0')}`;
}

/** "07:00" -> "7 am", "13:30" -> "1:30 pm" */
export function formatTime(hhmm) {
  const parts = toParts(hhmm);
  return `${clock(parts)} ${parts.meridiem}`;
}

/** ("07:00", "09:00") -> "7–9 am"; ("11:00", "13:00") -> "11 am–1 pm" */
export function formatWindow(start, end) {
  const from = toParts(start);
  const to = toParts(end);
  if (from.meridiem === to.meridiem) {
    return `${clock(from)}–${clock(to)} ${to.meridiem}`;
  }
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** ("07:00", "09:00") -> "between 7 and 9 am"; ("11:00", "13:00") -> "between 11 am and 1 pm" */
export function windowInWords(start, end) {
  const from = toParts(start);
  const to = toParts(end);
  if (from.meridiem === to.meridiem) {
    return `between ${clock(from)} and ${clock(to)} ${to.meridiem}`;
  }
  return `between ${formatTime(start)} and ${formatTime(end)}`;
}

/** An instant from the API (UTC ISO string) as a clock time in a time zone: "7 am", "12:30 pm". */
export function formatClock(isoTime, timeZone) {
  return formatTime(DateTime.fromISO(isoTime).setZone(timeZone).toFormat('HH:mm'));
}

/** A calendar date from the API ("2026-10-21") as "Wed 21 Oct". It has no time, so no time zone. */
export function formatDate(isoDate) {
  return DateTime.fromISO(isoDate).toFormat('ccc d LLL');
}

/** An instant from the API as a day and clock time in a time zone: "Sun 12 Oct, 6:30 am". */
export function formatDayAndTime(isoTime, timeZone) {
  const day = DateTime.fromISO(isoTime).setZone(timeZone).toFormat('ccc d LLL');
  return `${day}, ${formatClock(isoTime, timeZone)}`;
}

/** Minutes since midnight: "07:30" -> 450. Used to place a window on a 24-hour strip. */
export function minutesOfDay(hhmm) {
  const { hour, minute } = toParts(hhmm);
  return hour * 60 + minute;
}

let options = null;

/** Every half hour from 12 am to 11:30 pm, for the From and To selects: { value: '07:30', label: '7:30 am' }. */
export function timeOptions() {
  if (!options) {
    options = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      options.push({ value, label: formatTime(value) });
    }
  }
  return options;
}
