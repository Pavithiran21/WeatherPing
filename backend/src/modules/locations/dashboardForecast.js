const { toLocationResponse } = require('./location.mapper');

// Index of the hourly slot that contains "now": the last slot that started at or before it.
// (Comparing slot starts, not UTC hours, keeps half-hour zones such as India correct:
// 07:00 IST is 01:30 UTC.)
function currentSlotIndex(hourly, now) {
  const index = hourly.findLastIndex((slot) => slot.time.getTime() <= now.getTime());
  return index === -1 ? 0 : index;
}

/**
 * Shapes the weather data for the dashboard: current conditions, the next 24 hours and
 * 7 days. airQuality may be null when that API failed; the rest still shows.
 */
function buildDashboardForecast(location, forecast, airQuality, now) {
  const start = currentSlotIndex(forecast.hourly, now);
  const next24Hours = forecast.hourly.slice(start, start + 24);

  let usAqi = null;
  if (airQuality && airQuality.hourly.length > 0) {
    usAqi = airQuality.hourly[currentSlotIndex(airQuality.hourly, now)].usAqi;
  }

  return {
    location: toLocationResponse(location),
    timeZone: forecast.timeZone,
    current: {
      ...forecast.current,
      rainChance: next24Hours[0]?.rainChance ?? null,
      usAqi,
    },
    next24Hours,
    next7Days: forecast.daily.slice(0, 7),
  };
}

module.exports = { buildDashboardForecast };
