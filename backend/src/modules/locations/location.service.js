const { AppError, notFound } = require('../../utils/AppError');
const { logger } = require('../../utils/logger');
const { isDuplicateKeyError } = require('../../utils/mongoErrors');
const { parseSort, skipFor, toPage } = require('../../utils/pagination');
const { ruleRepository } = require('../rules/rule.repository');
const { getAirQuality, getForecast, searchPlaces, WeatherApiError } = require('../weather/openMeteo.client');
const { parseCoordinates, roundCoordinate } = require('./coordinates');
const { buildDashboardForecast } = require('./dashboardForecast');
const { toLocationResponse } = require('./location.mapper');
const { locationRepository } = require('./location.repository');

function weatherUnavailable(error) {
  logger.warn({ reason: error.reason }, 'Weather API call failed');
  return new AppError(502, 'WEATHER_SERVICE_UNAVAILABLE', "The weather service didn't answer. Try again.");
}

/** Coordinates are answered directly; anything else is a name search. Returns a list of places. */
async function searchPlacesByText(text) {
  const coordinates = parseCoordinates(text);
  if (coordinates) {
    const latitude = roundCoordinate(coordinates.latitude);
    const longitude = roundCoordinate(coordinates.longitude);
    return [{ name: `${latitude}, ${longitude}`, region: null, country: null, latitude, longitude }];
  }

  try {
    return await searchPlaces(text);
  } catch (error) {
    if (error instanceof WeatherApiError) {
      throw weatherUnavailable(error);
    }
    throw error;
  }
}

/** Returns the place if it belongs to the user; another user's place is "not found". */
async function getOwnedLocation(userId, locationId) {
  const location = await locationRepository.findOwned(userId, locationId);
  if (!location) {
    throw notFound('Place');
  }
  return location;
}

async function listLocations(userId, pageQuery) {
  const sort = parseSort(pageQuery.sort, ['createdAt', 'name'], 'createdAt');
  const [locations, totalItems] = await locationRepository.listOwned(userId, {
    skip: skipFor(pageQuery),
    limit: pageQuery.size,
    sort,
  });
  return toPage(locations.map(toLocationResponse), totalItems, pageQuery);
}

/** input: { name, region?, country?, latitude, longitude } */
async function addLocation(userId, input) {
  try {
    const location = await locationRepository.create({
      userId,
      name: input.name,
      region: input.region ?? null,
      country: input.country ?? null,
      latitude: roundCoordinate(input.latitude),
      longitude: roundCoordinate(input.longitude),
    });
    return toLocationResponse(location);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'LOCATION_EXISTS', 'That place is already in your spots.');
    }
    throw error;
  }
}

/** Removes the place and its rules. Alerts already sent for it stay in the history. */
async function removeLocation(userId, locationId) {
  const deleted = await locationRepository.deleteOwned(userId, locationId);
  if (!deleted) {
    throw notFound('Place');
  }
  await ruleRepository.deleteAllForLocation(userId, locationId);
}

/** Current weather, next 24 hours and 7 days for one of the user's places. */
async function getLocationForecast(userId, locationId, now = new Date()) {
  const location = await getOwnedLocation(userId, locationId);

  // Both APIs are called at the same time. The forecast is required; air quality is a
  // separate service, so if only it fails the dashboard still shows the forecast.
  const [forecastResult, airQualityResult] = await Promise.allSettled([
    getForecast(location.latitude, location.longitude),
    getAirQuality(location.latitude, location.longitude),
  ]);

  if (forecastResult.status === 'rejected') {
    if (forecastResult.reason instanceof WeatherApiError) {
      throw weatherUnavailable(forecastResult.reason);
    }
    throw forecastResult.reason;
  }

  let airQuality = null;
  if (airQualityResult.status === 'fulfilled') {
    airQuality = airQualityResult.value;
  } else {
    logger.warn({ reason: airQualityResult.reason?.reason ?? 'unexpected' }, 'Air quality unavailable');
  }

  return buildDashboardForecast(location, forecastResult.value, airQuality, now);
}

module.exports = {
  searchPlacesByText,
  getOwnedLocation,
  listLocations,
  addLocation,
  removeLocation,
  getLocationForecast,
};
