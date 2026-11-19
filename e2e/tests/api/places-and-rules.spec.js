const { test, expect } = require('@playwright/test');
const { failure, fieldsOf, json, newPlace, newRule, newUser, placeBody, SEEDED, loginAs } = require('../../helpers/api');

// Places (found by search or coordinates), the weather shown for them, and alert rules: each condition has
// its own range, a window can't cross midnight, and every query is scoped to the logged-in user.

test.describe('places', () => {
  test('search finds a named place, answers coordinates without a lookup, and an unknown name is an empty list', async ({ request }) => {
    const api = await newUser(request);
    const found = await json(await api.get('/locations/search?q=Chennai'), 200);
    expect(found.results).toEqual([{ name: 'Chennai', region: 'Tamil Nadu', country: 'India', latitude: 13.0878, longitude: 80.2785 }]);
    const coordinates = await json(await api.get('/locations/search?q=13.08%2C%2080.27'), 200);
    expect(coordinates.results).toEqual([{ name: '13.08, 80.27', region: null, country: null, latitude: 13.08, longitude: 80.27 }]);
    expect((await json(await api.get('/locations/search?q=Nowhereville'), 200)).results).toEqual([]);
  });

  test('a bad search is a 400, and a geocoding service that is down is a 502, not a crash', async ({ request }) => {
    const api = await newUser(request);
    expect(fieldsOf(await failure(await api.get('/locations/search?q=a'), 400, 'VALIDATION_FAILED'))).toContain('q');
    expect(fieldsOf(await failure(await api.get('/locations/search?q=%3Cscript%3E'), 400, 'VALIDATION_FAILED'))).toContain('q');
    await failure(await api.get('/locations/search?q=Failville'), 502, 'WEATHER_SERVICE_UNAVAILABLE');
  });

  test('a place is saved with its coordinates rounded to 4 decimals; the same spot twice is a 409; bad values are a 400', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/locations', { name: 'Home', latitude: 13.087812345, longitude: 80.278512345 }), 201);
    expect(saved).toMatchObject({ name: 'Home', latitude: 13.0878, longitude: 80.2785, region: null });
    await failure(await api.post('/locations', { name: 'Home again', latitude: 13.0878, longitude: 80.2785 }), 409, 'LOCATION_EXISTS');
    for (const bad of [{ latitude: 91 }, { latitude: -91 }, { longitude: 181 }, { name: '   ' }, { latitude: '13' }]) {
      await failure(await api.post('/locations', { ...placeBody(11), ...bad }), 400, 'VALIDATION_FAILED');
    }
  });

  test('the forecast shows now, the next 24 hours and 7 days, with air quality', async ({ request }) => {
    const api = await newUser(request);
    const rainy = await newPlace(api, 10);
    const forecast = await json(await api.get(`/locations/${rainy.id}/forecast`), 200);
    expect(forecast.timeZone).toBe('Asia/Kolkata');
    expect(forecast.current).toMatchObject({ temperature: 30, rainChance: 95, usAqi: 40, windSpeed: 10 });
    expect(forecast.next24Hours).toHaveLength(24);
    expect(forecast.next7Days).toHaveLength(7);
    const smoggy = await newPlace(api, 16);
    expect((await json(await api.get(`/locations/${smoggy.id}/forecast`), 200)).current.usAqi).toBe(220);
  });

  test('a weather service that is down, slow, broken or answering something odd is a 502 that says so', async ({ request }) => {
    test.setTimeout(60_000);
    const api = await newUser(request);
    for (const band of [17, 18, 19, 20]) {
      const place = await newPlace(api, band);
      await failure(await api.get(`/locations/${place.id}/forecast`), 502, 'WEATHER_SERVICE_UNAVAILABLE');
    }
  });

  test('deleting a place deletes its rules; a place that is not yours, or not there, is 404', async ({ request }) => {
    const api = await newUser(request);
    const stranger = await newUser(request);
    const place = await newPlace(api, 11);
    const rule = await newRule(api, place);
    expect((await stranger.get(`/locations/${place.id}/forecast`)).status()).toBe(404);
    expect((await stranger.delete(`/locations/${place.id}`)).status()).toBe(404);
    expect((await json(await stranger.get('/locations'), 200)).totalItems).toBe(0);
    expect((await api.delete(`/locations/${place.id}`)).status()).toBe(204);
    expect((await api.get(`/rules/${rule.id}`)).status()).toBe(404);
    expect((await api.delete(`/locations/${place.id}`)).status()).toBe(404);
  });
});

test.describe('rules', () => {
  test('a rule comes back with a plain-language summary, and starts active', async ({ request }) => {
    const api = await newUser(request);
    const place = await newPlace(api, 10);
    const rule = await newRule(api, place, { condition: 'rain', threshold: 60, windowStart: '07:00', windowEnd: '09:00' });
    expect(rule).toMatchObject({ status: 'active', locationId: place.id, condition: 'rain', threshold: 60 });
    expect(rule.summary).toBe('rain chance is 60% or more between 7 and 9 am');
  });

  test('each condition has its own range, inclusive at both ends', async ({ request }) => {
    const api = await newUser(request);
    const place = await newPlace(api, 11);
    const ranges = { rain: [10, 100], heat: [20, 55], cold: [-30, 20], wind: [10, 150], aqi: [50, 500] };
    for (const [condition, [min, max]] of Object.entries(ranges)) {
      for (const threshold of [min - 1, max + 1]) {
        const error = await failure(await api.post('/rules', { locationId: place.id, condition, threshold, windowStart: '07:00', windowEnd: '09:00' }), 400, 'VALIDATION_FAILED');
        expect(fieldsOf(error), `${condition} ${threshold}`).toContain('threshold');
      }
      for (const threshold of [min, max]) {
        await json(await api.post('/rules', { locationId: place.id, condition, threshold, windowStart: '07:00', windowEnd: '09:00' }), 201);
      }
    }
  });

  test('a window must end after it starts, use HH:mm, and name a real condition and one of your places', async ({ request }) => {
    const api = await newUser(request);
    const stranger = await newUser(request);
    const place = await newPlace(api, 11);
    const base = { locationId: place.id, condition: 'rain', threshold: 60, windowStart: '07:00', windowEnd: '09:00' };
    expect(fieldsOf(await failure(await api.post('/rules', { ...base, windowEnd: '07:00' }), 400, 'VALIDATION_FAILED'))).toContain('windowEnd');
    expect(fieldsOf(await failure(await api.post('/rules', { ...base, windowStart: '22:00', windowEnd: '02:00' }), 400, 'VALIDATION_FAILED'))).toContain('windowEnd');
    expect(fieldsOf(await failure(await api.post('/rules', { ...base, windowStart: '7am' }), 400, 'VALIDATION_FAILED'))).toContain('windowStart');
    expect(fieldsOf(await failure(await api.post('/rules', { ...base, condition: 'snow' }), 400, 'VALIDATION_FAILED'))).toContain('condition');
    expect(fieldsOf(await failure(await api.post('/rules', { ...base, threshold: '60' }), 400, 'VALIDATION_FAILED'))).toContain('threshold');
    await failure(await stranger.post('/rules', base), 404);
  });

  test('pause and resume change the status; a patch is merged with the stored rule and checked as a whole', async ({ request }) => {
    const api = await newUser(request);
    const place = await newPlace(api, 11);
    const rule = await newRule(api, place, { condition: 'rain', threshold: 60 });
    expect((await json(await api.post(`/rules/${rule.id}/pause`), 200)).status).toBe('paused');
    expect((await json(await api.post(`/rules/${rule.id}/resume`), 200)).status).toBe('active');

    const patched = await json(await api.patch(`/rules/${rule.id}`, { threshold: 80 }), 200);
    expect(patched).toMatchObject({ condition: 'rain', threshold: 80, windowStart: '00:00', windowEnd: '23:59' });
    // Heat can't be 80: the new condition is checked against the stored threshold.
    expect(fieldsOf(await failure(await api.patch(`/rules/${rule.id}`, { condition: 'heat' }), 400, 'VALIDATION_FAILED'))).toContain('threshold');
    await failure(await api.patch(`/rules/${rule.id}`, {}), 400, 'VALIDATION_FAILED');
    expect((await json(await api.get(`/rules/${rule.id}`), 200)).condition).toBe('rain');
  });

  test('the list filters by status and place, and pages', async ({ request }) => {
    const api = await newUser(request);
    const first = await newPlace(api, 11);
    const second = await newPlace(api, 11);
    const a = await newRule(api, first, { condition: 'rain', threshold: 60 });
    await newRule(api, first, { condition: 'heat', threshold: 40 });
    await newRule(api, second, { condition: 'wind', threshold: 50 });
    await api.post(`/rules/${a.id}/pause`);
    const count = async (query) => (await json(await api.get(`/rules?${query}`), 200)).totalItems;
    expect(await count('')).toBe(3);
    expect(await count('status=paused')).toBe(1);
    expect(await count('status=active')).toBe(2);
    expect(await count(`locationId=${first.id}`)).toBe(2);
    expect(await count(`locationId=${second.id}&status=active`)).toBe(1);
    const paged = await json(await api.get('/rules?size=2&page=2'), 200);
    expect(paged).toMatchObject({ page: 2, size: 2, totalItems: 3, totalPages: 2 });
    expect(paged.items).toHaveLength(1);
    await failure(await api.get('/rules?status=gone'), 400, 'VALIDATION_FAILED');
  });

  test('another user\'s rule can\'t be read, changed, paused or deleted, and is not in their list', async ({ request }) => {
    const owner = await newUser(request);
    const stranger = await newUser(request);
    const rule = await newRule(owner, await newPlace(owner, 11));
    for (const response of [
      await stranger.get(`/rules/${rule.id}`),
      await stranger.patch(`/rules/${rule.id}`, { threshold: 70 }),
      await stranger.post(`/rules/${rule.id}/pause`),
      await stranger.post(`/rules/${rule.id}/resume`),
      await stranger.delete(`/rules/${rule.id}`),
    ]) {
      expect(response.status(), response.url()).toBe(404);
    }
    expect((await json(await stranger.get('/rules'), 200)).totalItems).toBe(0);
    expect(await json(await owner.get(`/rules/${rule.id}`), 200)).toMatchObject({ threshold: 60, status: 'active' });
    expect((await owner.delete(`/rules/${rule.id}`)).status()).toBe(204);
    expect((await owner.delete(`/rules/${rule.id}`)).status()).toBe(404);
  });
});

test.describe('alert history', () => {
  // "Mark all read" changes what the other tests read, so these run one after another.
  test.describe.configure({ mode: 'serial' });

  test('lists only sent alerts, newest first, in pages; the failed and the still-sending ones are never shown', async ({ request }) => {
    const api = await loginAs(request, SEEDED.alerts);
    const page = await json(await api.get('/alerts?size=10'), 200);
    expect(page).toMatchObject({ page: 1, size: 10, totalItems: 25, totalPages: 3 });
    const dates = page.items.map((alert) => alert.eventDate);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(page.items[0]).toMatchObject({ read: false, summary: expect.stringMatching(/ or more |reaches/) });
    const all = await json(await api.get('/alerts?size=100'), 200);
    expect(all.items).toHaveLength(25);
  });

  test('the unread count, the place filter and "mark all read"', async ({ request }) => {
    const api = await loginAs(request, SEEDED.alerts);
    const all = await json(await api.get('/alerts?size=100'), 200);
    const chennai = all.items.filter((alert) => alert.locationName === 'Chennai');
    expect(chennai).toHaveLength(15);
    const filtered = await json(await api.get(`/alerts?locationId=${chennai[0].locationId}&size=100`), 200);
    expect(filtered.totalItems).toBe(15);
    expect((await json(await api.get('/alerts/unread-count'), 200)).count).toBe(2);
    expect((await api.post('/alerts/mark-read')).status()).toBe(204);
    expect((await json(await api.get('/alerts/unread-count'), 200)).count).toBe(0);
  });

  test('nobody else sees these alerts: another user\'s history is empty and their counts are zero', async ({ request }) => {
    const stranger = await newUser(request);
    expect((await json(await stranger.get('/alerts'), 200)).totalItems).toBe(0);
    expect((await json(await stranger.get('/alerts/unread-count'), 200)).count).toBe(0);
    const owner = await loginAs(request, SEEDED.owner);
    expect((await json(await owner.get('/alerts/unread-count'), 200)).count).toBe(2);
  });
});
