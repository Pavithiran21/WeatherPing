const { DateTime } = require('luxon');
const { z } = require('zod');
const { env } = require('../../config/env');

const RETRY_DELAY_MS = 500;

/**
 * The weather service could not give a usable answer, even after one retry.
 * reason: 'timeout' | 'network' | 'http_<status>' | 'bad_response'
 */
class WeatherApiError extends Error {
  constructor(reason, status = null) {
    super(`Weather API failed: ${reason}`);
    this.name = 'WeatherApiError';
    this.reason = reason;
    this.status = status;
  }
}

function isRetryable(error) {
  return error.reason === 'timeout' || error.reason === 'network' || error.status >= 500;
}

async function fetchOnce(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(env.WEATHER_TIMEOUT_MS) });
  } catch (error) {
    throw new WeatherApiError(error.name === 'TimeoutError' ? 'timeout' : 'network');
  }

  if (!response.ok) {
    throw new WeatherApiError(`http_${response.status}`, response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new WeatherApiError('bad_response');
  }
}

/** GET baseUrl?params as JSON, with a timeout and one retry for errors that might pass (timeouts, 5xx). */
async function fetchJson(baseUrl, params) {
  const url = `${baseUrl}?${new URLSearchParams(params)}`;
  try {
    return await fetchOnce(url);
  } catch (error) {
    if (!isRetryable(error)) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchOnce(url);
  }
}

// An unexpected response shape counts as a failure: alerts are never based on data we cannot read.
function parseResponse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new WeatherApiError('bad_response');
  }
  return result.data;
}

// Open-Meteo returns local times without an offset ("2026-10-20T07:00") in the response's
// time zone. We turn them into real instants (UTC) straight away.
function toUtcDate(localTime, timeZone) {
  return DateTime.fromISO(localTime, { zone: timeZone }).toUTC().toJSDate();
}

const numbers = z.array(z.number().nullable());

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
});

const forecastSchema = z.object({
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number().nullable(),
    apparent_temperature: z.number().nullable(),
    relative_humidity_2m: z.number().nullable(),
    wind_speed_10m: z.number().nullable(),
    weather_code: z.number().nullable(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: numbers,
    relative_humidity_2m: numbers,
    precipitation_probability: numbers,
    wind_speed_10m: numbers,
    weather_code: numbers,
  }),
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
    precipitation_probability_max: numbers,
    weather_code: numbers,
  }),
});

const airQualitySchema = z.object({
  timezone: z.string(),
  hourly: z.object({
    time: z.array(z.string()),
    us_aqi: numbers,
  }),
});

/** Place search by name. Returns [{ name, region, country, latitude, longitude }] (empty when nothing matches). */
async function searchPlaces(name) {
  const data = await fetchJson(env.OPEN_METEO_GEOCODING_URL, { name, count: 5, language: 'en', format: 'json' });
  const { results = [] } = parseResponse(geocodingSchema, data);
  return results.map((place) => ({
    name: place.name,
    region: place.admin1 ?? null,
    country: place.country ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
  }));
}

/**
 * Current conditions, hourly values (times as UTC Dates) and daily values (local dates)
 * for the next 7 days. Used by the dashboard and the alert evaluator.
 */
async function getForecast(latitude, longitude) {
  const data = await fetchJson(env.OPEN_METEO_FORECAST_URL, {
    latitude,
    longitude,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'auto',
    forecast_days: 7,
  });
  const forecast = parseResponse(forecastSchema, data);
  const { hourly, daily, current, timezone } = forecast;

  return {
    timeZone: timezone,
    current: {
      time: toUtcDate(current.time, timezone),
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
    },
    hourly: hourly.time.map((time, i) => ({
      time: toUtcDate(time, timezone),
      temperature: hourly.temperature_2m[i] ?? null,
      humidity: hourly.relative_humidity_2m[i] ?? null,
      rainChance: hourly.precipitation_probability[i] ?? null,
      windSpeed: hourly.wind_speed_10m[i] ?? null,
      weatherCode: hourly.weather_code[i] ?? null,
    })),
    daily: daily.time.map((date, i) => ({
      date,
      temperatureMax: daily.temperature_2m_max[i] ?? null,
      temperatureMin: daily.temperature_2m_min[i] ?? null,
      rainChanceMax: daily.precipitation_probability_max[i] ?? null,
      weatherCode: daily.weather_code[i] ?? null,
    })),
  };
}

/** Hourly US AQI for the next 5 days, times as UTC Dates. */
async function getAirQuality(latitude, longitude) {
  const data = await fetchJson(env.OPEN_METEO_AIR_QUALITY_URL, {
    latitude,
    longitude,
    hourly: 'us_aqi',
    timezone: 'auto',
    forecast_days: 5,
  });
  const { hourly, timezone } = parseResponse(airQualitySchema, data);

  return {
    timeZone: timezone,
    hourly: hourly.time.map((time, i) => ({
      time: toUtcDate(time, timezone),
      usAqi: hourly.us_aqi[i] ?? null,
    })),
  };
}

module.exports = { WeatherApiError, searchPlaces, getForecast, getAirQuality };
