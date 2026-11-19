// "13.08, 80.27" or "-33.86,151.21": latitude, then longitude, in decimal degrees.
const COORDINATES_PATTERN = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Returns { latitude, longitude } when the text is a valid coordinate pair, otherwise null. */
function parseCoordinates(text) {
  const match = COORDINATES_PATTERN.exec(text);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

// 4 decimal places is about 11 metres: precise enough for weather, and it makes
// "the same place" comparable for the unique index.
function roundCoordinate(value) {
  return Math.round(value * 10_000) / 10_000;
}

module.exports = { parseCoordinates, roundCoordinate };
