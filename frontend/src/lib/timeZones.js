import { DateTime } from 'luxon';

// Browsers built on older time zone data still report a few renamed zones
// (Chrome says "Asia/Calcutta"). Show and save the current IANA name instead;
// the backend accepts both.
const RENAMED_ZONES = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Europe/Kiev': 'Europe/Kyiv',
};

export function currentZoneName(zone) {
  return RENAMED_ZONES[zone] ?? zone;
}

/** The browser's own time zone, used to pre-fill Register. */
export function browserTimeZone() {
  return currentZoneName(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** "UTC+05:30" (today's offset, so daylight saving is included). */
export function utcOffsetLabel(zone) {
  return `UTC${DateTime.now().setZone(zone).toFormat('ZZ')}`;
}

/** "Asia/Kolkata (UTC+05:30)" */
export function timeZoneLabel(zone) {
  return zone ? `${zone} (${utcOffsetLabel(zone)})` : '';
}

let allZones = null;

/** Every time zone the browser knows, A to Z, with its UTC offset. Built once. */
export function listTimeZones() {
  if (!allZones) {
    const names = new Set(Intl.supportedValuesOf('timeZone').map(currentZoneName));
    names.add('UTC');
    allZones = [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, offset: utcOffsetLabel(name) }));
  }
  return allZones;
}

function normalise(text) {
  return text.toLowerCase().replace(/[_/]/g, ' ');
}

/** Zones whose name or offset contains the typed text ("kolk", "new york", "+05:30"). */
export function filterTimeZones(query) {
  const wanted = normalise(query.trim());
  if (!wanted) {
    return listTimeZones();
  }
  return listTimeZones().filter((zone) => normalise(zone.name).includes(wanted) || zone.offset.includes(wanted));
}
