const { getAirQuality, getForecast } = require('../weather/openMeteo.client');

/**
 * Weather data for one evaluator run. Each place is fetched at most once per run,
 * however many rules (or users) share it. The cache stores the promise, so a failure
 * is remembered too and the place is not called again for every rule.
 * A new cache is created for every run, so no data is reused across runs.
 */
function createRunWeatherCache() {
  const forecasts = new Map();
  const airQuality = new Map();

  function cached(map, latitude, longitude, fetcher) {
    const key = `${latitude},${longitude}`;
    if (!map.has(key)) {
      map.set(key, fetcher(latitude, longitude));
    }
    return map.get(key);
  }

  return {
    forecast: (latitude, longitude) => cached(forecasts, latitude, longitude, getForecast),
    airQuality: (latitude, longitude) => cached(airQuality, latitude, longitude, getAirQuality),
  };
}

module.exports = { createRunWeatherCache };
