import { apiRequest } from './client';

// Saved places ("spots") and their forecasts. See BACKEND.md "Places".

/** Place search by name or "lat, lon". Returns { results: [{ name, region, country, latitude, longitude }] }. */
export function searchPlaces(q, signal) {
  return apiRequest(`/locations/search?q=${encodeURIComponent(q)}`, { signal });
}

/** All of the user's places, oldest first. A user has only a few, so one page of 100 holds them all. */
export function listLocations() {
  return apiRequest('/locations?size=100&sort=createdAt');
}

export function createLocation({ name, region, country, latitude, longitude }) {
  return apiRequest('/locations', { method: 'POST', body: { name, region, country, latitude, longitude } });
}

/** { location, timeZone, current, next24Hours, next7Days }. 502 when the weather service didn't answer. */
export function getForecast(locationId) {
  return apiRequest(`/locations/${locationId}/forecast`);
}

/** Removes the place and its rules; its past alerts stay in the history. */
export function removeLocation(locationId) {
  return apiRequest(`/locations/${locationId}`, { method: 'DELETE' });
}
