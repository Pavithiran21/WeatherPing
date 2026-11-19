// Rule windows are stored as 24-hour "HH:mm" strings and shown the way the approved
// design writes them: 12-hour, with "am"/"pm" said once when both ends share it.

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
function formatTime(hhmm) {
  const parts = toParts(hhmm);
  return `${clock(parts)} ${parts.meridiem}`;
}

/** ("07:00", "09:00") -> "7–9 am"; ("11:00", "13:00") -> "11 am–1 pm" */
function formatWindow(start, end) {
  const from = toParts(start);
  const to = toParts(end);
  if (from.meridiem === to.meridiem) {
    return `${clock(from)}–${clock(to)} ${to.meridiem}`;
  }
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** ("07:00", "09:00") -> "between 7 and 9 am"; ("11:00", "13:00") -> "between 11 am and 1 pm" */
function windowInWords(start, end) {
  const from = toParts(start);
  const to = toParts(end);
  if (from.meridiem === to.meridiem) {
    return `between ${clock(from)} and ${clock(to)} ${to.meridiem}`;
  }
  return `between ${formatTime(start)} and ${formatTime(end)}`;
}

module.exports = { formatTime, formatWindow, windowInWords };
