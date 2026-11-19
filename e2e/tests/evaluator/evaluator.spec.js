const { randomBytes } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { apiUrl, eventDates, json, newPlace, newRule, newUser, placeBody, runEvaluator, stubCalls, client } = require('../../helpers/api');
const { countMail, waitForMail } = require('../../helpers/mail');

// The signature feature: one email per rule per event, however often the evaluator runs and even when runs
// overlap. The weather comes from mocks/open-meteo-stub.js, whose answer depends on the place's latitude.
// A whole-day window is "upcoming" at any time of day, so a rule has two events: today's and tomorrow's date
// in the user's time zone. An evaluator run checks every active rule in the database, so this file runs last
// and one test at a time, and every assertion is about the test's own user.

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SUMMARY_KEYS = ['runId', 'rulesChecked', 'alertsSent', 'duplicatesSkipped', 'locationsSkipped', 'emailFailures'];

/** One run's summary, which must be a 200. */
async function run(request) {
  return json(await runEvaluator(request), 200);
}

const alertsOf = async (api) => (await json(await api.get('/alerts?size=100'), 200)).items;

/** The local dates of today and tomorrow in a time zone. */
function datesIn(timeZone) {
  const format = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  return [format(Date.now()), format(Date.now() + 24 * 3_600_000)];
}

test('run three times and then three at once: each rule and event is claimed once, so the user gets two alerts and two emails', async ({ request }) => {
  const user = await newUser(request);
  const rule = await newRule(user, await newPlace(user, 10, 'Rainford'), { condition: 'rain', threshold: 60 });

  const first = await run(request);
  expect(Object.keys(first).sort()).toEqual([...SUMMARY_KEYS].sort());
  expect(first.alertsSent).toBeGreaterThanOrEqual(2);
  const later = [await run(request), await run(request)];
  const parallel = await Promise.all([run(request), run(request), run(request)]);
  // Nothing was left to send after the first run, and every other run saw the claims and skipped them.
  expect([...later, ...parallel].reduce((sum, summary) => sum + summary.alertsSent, 0)).toBe(0);
  expect(parallel.reduce((sum, summary) => sum + summary.duplicatesSkipped, 0)).toBeGreaterThanOrEqual(6);

  const alerts = await alertsOf(user);
  expect(alerts.map((alert) => alert.eventDate).sort()).toEqual(eventDates().sort());
  expect(alerts.every((alert) => alert.ruleId === rule.id && alert.forecastValue === 95 && alert.locationName === 'Rainford')).toBe(true);

  await waitForMail({ to: user.email, subject: /Rain expected/ });
  await pause(4000);
  expect(await countMail({ to: user.email, subject: /Rain expected/ })).toBe(2);
});

test('five runs started at once for a brand-new rule: exactly two emails are sent, one per event', async ({ request }) => {
  const user = await newUser(request);
  await newRule(user, await newPlace(user, 10), { condition: 'rain', threshold: 60 });
  const summaries = await Promise.all(Array.from({ length: 5 }, () => run(request)));
  expect(summaries.reduce((sum, summary) => sum + summary.alertsSent, 0)).toBe(2);
  expect((await alertsOf(user)).map((alert) => alert.eventDate).sort()).toEqual(eventDates().sort());
  await waitForMail({ to: user.email, subject: /Rain expected/ });
  await pause(4000);
  expect(await countMail({ to: user.email, subject: /Rain expected/ })).toBe(2);
});

test('each condition alerts when the forecast reaches the threshold (inclusive), and stays quiet when it does not', async ({ request }) => {
  const user = await newUser(request);
  const rainy = await newPlace(user, 10);
  const dry = await newPlace(user, 11);
  const hot = await newPlace(user, 12);
  const cold = await newPlace(user, 14);
  const windy = await newPlace(user, 15);
  const smoggy = await newPlace(user, 16);
  // The stub's values: rain 95 %, heat 46 °C, cold 5 °C, wind 70 km/h, US AQI 220.
  const fires = {
    'rain 95': await newRule(user, rainy, { condition: 'rain', threshold: 95 }),
    'heat 40': await newRule(user, hot, { condition: 'heat', threshold: 40 }),
    'cold 5': await newRule(user, cold, { condition: 'cold', threshold: 5 }),
    'cold 10': await newRule(user, cold, { condition: 'cold', threshold: 10 }),
    'wind 50': await newRule(user, windy, { condition: 'wind', threshold: 50 }),
    'aqi 150': await newRule(user, smoggy, { condition: 'aqi', threshold: 150 }),
  };
  const quiet = [
    await newRule(user, rainy, { condition: 'rain', threshold: 96 }),
    await newRule(user, dry, { condition: 'rain', threshold: 60 }),
    await newRule(user, hot, { condition: 'heat', threshold: 47 }),
    await newRule(user, cold, { condition: 'cold', threshold: 4 }),
    await newRule(user, windy, { condition: 'wind', threshold: 71 }),
    await newRule(user, smoggy, { condition: 'aqi', threshold: 221 }),
  ];
  await run(request);

  const alerts = await alertsOf(user);
  const byRule = (rule) => alerts.filter((alert) => alert.ruleId === rule.id);
  const worst = { 'rain 95': 95, 'heat 40': 46, 'cold 5': 5, 'cold 10': 5, 'wind 50': 70, 'aqi 150': 220 };
  for (const [name, rule] of Object.entries(fires)) {
    expect(byRule(rule).map((alert) => alert.forecastValue), name).toEqual([worst[name], worst[name]]);
  }
  for (const rule of quiet) expect(byRule(rule), `${rule.condition} ${rule.threshold}`).toHaveLength(0);
  expect(alerts).toHaveLength(12);

  const subjects = { Rain: /Rain expected/, Heat: /Heat expected/, Cold: /Cold expected/, Wind: /Strong wind expected/, Air: /Poor air expected/ };
  for (const pattern of Object.values(subjects)) await waitForMail({ to: user.email, subject: pattern });
});

test('a paused rule gets no alert, and resuming it brings them back on the next run', async ({ request }) => {
  const user = await newUser(request);
  const rule = await newRule(user, await newPlace(user, 10), { condition: 'rain', threshold: 60 });
  await user.post(`/rules/${rule.id}/pause`);
  await run(request);
  expect(await alertsOf(user)).toHaveLength(0);
  await user.post(`/rules/${rule.id}/resume`);
  await run(request);
  expect(await alertsOf(user)).toHaveLength(2);
});

test('a weather service that is down, slow, broken or odd sends nothing, is counted, and does not stop the other places', async ({ request }) => {
  const user = await newUser(request);
  const working = await newPlace(user, 10, 'Rainford');
  await newRule(user, working, { condition: 'rain', threshold: 60 });
  const broken = [];
  for (const band of [17, 18, 19, 20]) {
    const place = await newPlace(user, band);
    await newRule(user, place, { condition: 'rain', threshold: 60 });
    broken.push(place);
  }
  try {
    const summary = await run(request);
    expect(summary.locationsSkipped).toBeGreaterThanOrEqual(4);
    const alerts = await alertsOf(user);
    expect(alerts).toHaveLength(2);
    expect(new Set(alerts.map((alert) => alert.locationName))).toEqual(new Set(['Rainford']));
  } finally {
    // The failing places would cost every later run a few seconds each.
    for (const place of broken) await user.delete(`/locations/${place.id}`);
  }
});

test('a place is asked about once per run however many rules and users share it, and only for what its rules need', async ({ request }) => {
  const one = await newUser(request);
  const two = await newUser(request);
  const body = placeBody(10);
  const shared = await json(await one.post('/locations', body), 201);
  const sharedToo = await json(await two.post('/locations', body), 201);
  await newRule(one, shared, { condition: 'rain', threshold: 60 });
  await newRule(one, shared, { condition: 'heat', threshold: 20 });
  await newRule(two, sharedToo, { condition: 'wind', threshold: 10 });
  const airOnly = await newPlace(one, 16);
  await newRule(one, airOnly, { condition: 'aqi', threshold: 150 });

  const before = {
    forecast: await stubCalls(request, shared.latitude, 'forecast'),
    air: await stubCalls(request, airOnly.latitude, 'air'),
    airOnlyForecast: await stubCalls(request, airOnly.latitude, 'forecast'),
  };
  await run(request);
  expect(await stubCalls(request, shared.latitude, 'forecast')).toBe(before.forecast + 1);
  expect(await stubCalls(request, airOnly.latitude, 'air')).toBe(before.air + 1);
  expect(await stubCalls(request, airOnly.latitude, 'forecast')).toBe(before.airOnlyForecast);
});

test('"today" and "tomorrow" are the user\'s own dates: a user in Auckland gets alerts for Auckland\'s days', async ({ request }) => {
  const user = await newUser(request, { timeZone: 'Pacific/Auckland' });
  await newRule(user, await newPlace(user, 10), { condition: 'rain', threshold: 60 });
  await run(request);
  expect((await alertsOf(user)).map((alert) => alert.eventDate).sort()).toEqual(datesIn('Pacific/Auckland').sort());
});

test('the emailed unsubscribe link pauses exactly that rule without a log-in, and Undo brings it back', async ({ request }) => {
  const user = await newUser(request);
  const keep = await newRule(user, await newPlace(user, 11), { condition: 'rain', threshold: 60 });
  const rule = await newRule(user, await newPlace(user, 10), { condition: 'rain', threshold: 60 });
  await run(request);

  const mail = await waitForMail({ to: user.email, subject: /Rain expected/ });
  expect(mail.text).toContain('Unsubscribe from this rule');
  const link = mail.html.match(/href="([^"]*\/unsubscribe\?token=([^"&]+))"/);
  expect(link, 'unsubscribe link in the email').toBeTruthy();
  const token = decodeURIComponent(link[2]);

  const paused = await json(await request.post(apiUrl('/unsubscribe'), { data: { token } }), 200);
  expect(paused).toMatchObject({ ruleId: rule.id, status: 'paused' });
  expect((await json(await user.get(`/rules/${rule.id}`), 200)).status).toBe('paused');
  expect((await json(await user.get(`/rules/${keep.id}`), 200)).status).toBe('active');

  await json(await request.post(apiUrl('/unsubscribe/undo'), { data: { token } }), 200);
  expect((await json(await user.get(`/rules/${rule.id}`), 200)).status).toBe('active');
});

test('mail for a demo address goes to the demo inbox and never to the main one', async ({ request }) => {
  const email = `demo.${randomBytes(4).toString('hex')}@demo.weatherping.test`;
  const password = `Pw-${randomBytes(8).toString('hex')}-1`;
  const body = await json(await request.post(apiUrl('/auth/register'), { data: { name: 'Demo Visitor', email, password, timeZone: 'Asia/Kolkata' } }), 201);
  const user = client(request, body.accessToken);
  await newRule(user, await newPlace(user, 10), { condition: 'rain', threshold: 60 });
  await run(request);
  await waitForMail({ to: email, subject: /Rain expected/, inbox: 'DEMO_SMTP' });
  expect(await countMail({ to: email, subject: /Rain expected/, inbox: 'SMTP' })).toBe(0);
});

test('a run reports counts only: no email address, name or place appears in its summary', async ({ request }) => {
  const user = await newUser(request);
  await newRule(user, await newPlace(user, 10, 'Rainford'), { condition: 'rain', threshold: 60 });
  const summary = await run(request);
  expect(Object.keys(summary).sort()).toEqual([...SUMMARY_KEYS].sort());
  const text = JSON.stringify(summary);
  expect(text).not.toContain(user.email);
  expect(text).not.toContain('Rainford');
  for (const key of SUMMARY_KEYS.slice(1)) expect(Number.isInteger(summary[key]), key).toBe(true);
});
