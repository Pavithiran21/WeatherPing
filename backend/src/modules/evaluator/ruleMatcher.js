const { CONDITIONS } = require('../rules/conditions');

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Decides whether a rule triggers in one window. Pure function: no database, no API.
 *
 * weather: { forecast?, airQuality? } as returned by the Open-Meteo client.
 * window:  { start, end } as UTC Dates.
 * Looks at the hourly slots that start inside the window and are not over yet,
 * takes the worst one (highest, or lowest for cold) and returns { value, time }
 * if it reaches the threshold, otherwise null.
 */
function findTrigger(rule, weather, window, now) {
  const condition = CONDITIONS[rule.condition];
  const series = condition.source === 'airQuality' ? weather.airQuality : weather.forecast;
  if (!series) {
    return null;
  }

  const points = series.hourly
    .filter((slot) => slot.time >= window.start && slot.time < window.end)
    .filter((slot) => slot.time.getTime() + ONE_HOUR_MS > now.getTime())
    .filter((slot) => slot[condition.reading] !== null)
    .map((slot) => ({ value: slot[condition.reading], time: slot.time }));

  if (points.length === 0) {
    return null;
  }

  const below = condition.direction === 'below';
  let worst = points[0];
  for (const point of points) {
    if (below ? point.value < worst.value : point.value > worst.value) {
      worst = point;
    }
  }

  const triggered = below ? worst.value <= rule.threshold : worst.value >= rule.threshold;
  return triggered ? worst : null;
}

module.exports = { findTrigger };
