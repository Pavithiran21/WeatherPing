const { randomBytes } = require('node:crypto');
const { expect } = require('@playwright/test');

// A small API client over Playwright's request context, plus helpers for places in the weather stub's
// bands (see mocks/open-meteo-stub.js) and for running the evaluator. Every test registers its own user.

const SEEDED = {
  user: 'user@e2e.weatherping.test',
  reset: 'reset@e2e.weatherping.test',
  locked: 'demo@e2e.weatherping.test',
  owner: 'owner@e2e.weatherping.test',
  alerts: 'alerts@e2e.weatherping.test',
  history: 'history@e2e.weatherping.test',
  demo: 'user@demo.weatherping.test',
};

const apiUrl = (pathname) => `${process.env.E2E_API_URL}${pathname}`;

function client(request, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const call = (method) => (pathname, data) => request.fetch(apiUrl(pathname), { method, headers, ...(data === undefined ? {} : { data }) });
  return { get: call('GET'), post: call('POST'), put: call('PUT'), patch: call('PATCH'), delete: call('DELETE'), token };
}

/** The JSON body of a response that must have the given status. */
async function json(response, status) {
  const text = await response.text();
  expect(response.status(), text.slice(0, 500)).toBe(status);
  return text ? JSON.parse(text) : null;
}

/** The error body of a response that must have the given status: { code, message, details, requestId }. */
async function failure(response, status, code) {
  const body = await json(response, status);
  expect(body.error, JSON.stringify(body)).toBeTruthy();
  if (code) expect(body.error.code).toBe(code);
  return body.error;
}

const fieldsOf = (error) => error.details.map((detail) => detail.field);

async function newUser(request, { timeZone = 'Asia/Kolkata' } = {}) {
  const email = `user.${randomBytes(5).toString('hex')}@e2e.weatherping.test`;
  const password = `Pw-${randomBytes(8).toString('hex')}-1`;
  const body = await json(await request.post(apiUrl('/auth/register'), { data: { name: 'Test User', email, password, timeZone } }), 201);
  return { ...client(request, body.accessToken), email, password, id: body.user.id };
}

async function loginAs(request, email, password = process.env.DEMO_PASSWORD) {
  const body = await json(await request.post(apiUrl('/auth/login'), { data: { email, password } }), 200);
  return client(request, body.accessToken);
}

const login = (request, email, password) => request.post(apiUrl('/auth/login'), { data: { email, password } });

/**
 * A place whose weather comes from the stub's band for that whole latitude (10 rainy, 11 dry, 12 hot,
 * 14 cold, 15 windy, 16 smoggy, 17 down, 18 slow, 19 broken, 20 odd). The decimals are random, so every
 * test has a place of its own and the stub can be asked how often it was called.
 */
function placeBody(band, name = `Place ${randomBytes(3).toString('hex')}`) {
  const latitude = Math.round((band + 0.05 + Math.random() * 0.9) * 10_000) / 10_000;
  const longitude = Math.round((70 + Math.random() * 10) * 10_000) / 10_000;
  return { name, region: 'Test region', country: 'India', latitude, longitude };
}

async function newPlace(api, band, name) {
  return json(await api.post('/locations', placeBody(band, name)), 201);
}

/** A rule on a place. The default window is the whole day, so it is "upcoming" at any time the tests run. */
async function newRule(api, location, { condition = 'rain', threshold = 60, windowStart = '00:00', windowEnd = '23:59' } = {}) {
  return json(await api.post('/rules', { locationId: location.id, condition, threshold, windowStart, windowEnd }), 201);
}

/** Today's and tomorrow's date in Asia/Kolkata: the two event dates a whole-day rule can alert for. */
function eventDates() {
  const format = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  const now = Date.now();
  return [format(now), format(now + 24 * 3_600_000)];
}

/** One evaluator run through the internal endpoint (the same call an external cron makes). */
function runEvaluator(request, secret = process.env.JOB_TRIGGER_SECRET) {
  return request.post(apiUrl('/internal/jobs/evaluate'), { headers: secret ? { 'X-Job-Secret': secret } : {} });
}

/** How many calls the weather stub had for a place (by its latitude as the app sends it), 'forecast' or 'air'. */
async function stubCalls(request, latitude, kind) {
  const response = await request.get(`${process.env.E2E_STUB_URL}/__calls?lat=${latitude}&kind=${kind}`);
  return (await response.json()).calls;
}

module.exports = { SEEDED, apiUrl, client, json, failure, fieldsOf, newUser, loginAs, login, placeBody, newPlace, newRule, eventDates, runEvaluator, stubCalls };
