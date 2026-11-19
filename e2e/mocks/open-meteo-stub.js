/**
 * A stand-in for the three Open-Meteo APIs, so a run needs no internet and every forecast is fixed.
 * make-env.js points OPEN_METEO_*_URL at http://127.0.0.1:8090. Start it on its own with:
 *   node e2e/mocks/open-meteo-stub.js
 *
 *   GET /v1/search?name=...       geocoding: a few named places (below); anything else has no results;
 *                                 a name containing "failville" gets HTTP 503
 *   GET /v1/forecast?latitude=..  current, hourly and daily values for 7 days, from today's midnight in
 *                                 Asia/Kolkata (the zone every test user has)
 *   GET /v1/air-quality?...       hourly US AQI for 5 days
 *
 * What the weather is like (and whether the service works) depends on the whole degrees of the latitude,
 * so a test picks its own place by giving it a unique latitude inside the right band, e.g. 10.4172:
 *
 *   10.x  rainy: 95 % rain chance every hour         16.x  smoggy: US AQI 220 every hour
 *   11.x  dry: 5 % rain                              17.x  down: always HTTP 503
 *   12.x  hot: 46 °C every hour                      18.x  slow: answers after 3 s (the app waits 1 s)
 *   14.x  cold: 5 °C every hour                      19.x  broken: a body that is not JSON
 *   15.x  windy: 70 km/h every hour                  20.x  odd: valid JSON of the wrong shape
 *   anything else: mild (20 % rain, 30 °C, 10 km/h wind, AQI 40)
 *
 * GET /__calls?lat=<whole latitude text>&kind=forecast|air  ->  { calls }: how many requests that
 *   latitude had (the "one weather call per place per run" test). POST /__reset clears the counters.
 * GET /__health  ->  { ok: true }
 */
const http = require('node:http');

const PORT = Number(process.env.OPEN_METEO_STUB_PORT ?? 8090);
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // Asia/Kolkata has no daylight saving.
const DAY_MS = 24 * 60 * 60 * 1000;
const calls = [];

const PLACES = [
  { name: 'Chennai', admin1: 'Tamil Nadu', country: 'India', latitude: 13.0878, longitude: 80.2785 },
  { name: 'Bengaluru', admin1: 'Karnataka', country: 'India', latitude: 12.9719, longitude: 77.5937 },
  { name: 'Rainford', admin1: 'Kerala', country: 'India', latitude: 10.5, longitude: 76.2 },
  { name: 'Dryton', admin1: 'Rajasthan', country: 'India', latitude: 11.5, longitude: 72.1 },
  { name: 'Hotpur', admin1: 'Rajasthan', country: 'India', latitude: 12.5, longitude: 73.4 },
  { name: 'Chillby', admin1: 'Himachal Pradesh', country: 'India', latitude: 14.5, longitude: 77.1 },
  { name: 'Smogville', admin1: 'Delhi', country: 'India', latitude: 16.5, longitude: 78.3 },
  { name: 'Brokenton', admin1: 'Odisha', country: 'India', latitude: 17.5, longitude: 83.2 },
];

function scenario(latitude) {
  switch (Math.floor(latitude)) {
    case 10: return 'rainy';
    case 11: return 'dry';
    case 12: return 'hot';
    case 14: return 'cold';
    case 15: return 'windy';
    case 16: return 'smoggy';
    case 17: return 'down';
    case 18: return 'slow';
    case 19: return 'broken';
    case 20: return 'odd';
    default: return 'mild';
  }
}

const pad = (value) => String(value).padStart(2, '0');

/** "2026-11-19T07:00" for a UTC millisecond value, in Asia/Kolkata. */
function localIso(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Today's midnight in Asia/Kolkata, as a UTC millisecond value. */
function todayMidnight(nowMs) {
  return Math.floor((nowMs + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

function readings(kind) {
  const base = { rain: 20, temperature: 30, wind: 10, humidity: 60, aqi: 40 };
  const changes = { rainy: { rain: 95 }, dry: { rain: 5 }, hot: { temperature: 46 }, cold: { temperature: 5 }, windy: { wind: 70 }, smoggy: { aqi: 220 } };
  return { ...base, ...(changes[kind] ?? {}) };
}

function forecastBody(latitude, nowMs) {
  const r = readings(scenario(latitude));
  const start = todayMidnight(nowMs);
  const hours = Array.from({ length: 7 * 24 }, (_, index) => start + index * 3_600_000);
  const days = Array.from({ length: 7 }, (_, index) => start + index * DAY_MS);
  const code = r.rain >= 60 ? 63 : 1;
  return {
    timezone: 'Asia/Kolkata',
    current: {
      time: localIso(Math.floor(nowMs / 900_000) * 900_000),
      temperature_2m: r.temperature,
      apparent_temperature: r.temperature + 2,
      relative_humidity_2m: r.humidity,
      wind_speed_10m: r.wind,
      weather_code: code,
    },
    hourly: {
      time: hours.map(localIso),
      temperature_2m: hours.map(() => r.temperature),
      relative_humidity_2m: hours.map(() => r.humidity),
      precipitation_probability: hours.map(() => r.rain),
      wind_speed_10m: hours.map(() => r.wind),
      weather_code: hours.map(() => code),
    },
    daily: {
      time: days.map((ms) => localIso(ms).slice(0, 10)),
      temperature_2m_max: days.map(() => r.temperature),
      temperature_2m_min: days.map(() => r.temperature - 6),
      precipitation_probability_max: days.map(() => r.rain),
      weather_code: days.map(() => code),
    },
  };
}

function airQualityBody(latitude, nowMs) {
  const r = readings(scenario(latitude));
  const start = todayMidnight(nowMs);
  const hours = Array.from({ length: 5 * 24 }, (_, index) => start + index * 3_600_000);
  return { timezone: 'Asia/Kolkata', hourly: { time: hours.map(localIso), us_aqi: hours.map(() => r.aqi) } };
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** The failures the "down", "slow", "broken" and "odd" places cause. Returns true when it answered. */
function misbehave(kind, res) {
  if (kind === 'down') {
    json(res, 503, { error: true, reason: 'stub: service unavailable' });
    return true;
  }
  if (kind === 'broken') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"this is": not json');
    return true;
  }
  if (kind === 'odd') {
    json(res, 200, { hello: 'world' });
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const nowMs = Date.now();

  if (url.pathname === '/__health') return json(res, 200, { ok: true });
  if (url.pathname === '/__reset' && req.method === 'POST') {
    calls.length = 0;
    return json(res, 200, { ok: true });
  }
  if (url.pathname === '/__calls') {
    const lat = url.searchParams.get('lat');
    const kind = url.searchParams.get('kind');
    return json(res, 200, { calls: calls.filter((call) => (!lat || call.lat === lat) && (!kind || call.kind === kind)).length });
  }

  if (url.pathname === '/v1/search') {
    const name = (url.searchParams.get('name') ?? '').trim().toLowerCase();
    if (name.includes('failville')) return json(res, 503, { error: true, reason: 'stub: geocoding is down' });
    const results = PLACES.filter((place) => place.name.toLowerCase().includes(name));
    return json(res, 200, results.length ? { results } : { generationtime_ms: 0.4 });
  }

  if (url.pathname === '/v1/forecast' || url.pathname === '/v1/air-quality') {
    const lat = url.searchParams.get('latitude') ?? '';
    const latitude = Number(lat);
    const kind = url.pathname === '/v1/forecast' ? 'forecast' : 'air';
    calls.push({ lat, kind });
    const place = scenario(latitude);
    const answer = () => {
      if (misbehave(place, res)) return;
      json(res, 200, kind === 'forecast' ? forecastBody(latitude, nowMs) : airQualityBody(latitude, nowMs));
    };
    if (place === 'slow') return void setTimeout(answer, 3000);
    return answer();
  }

  return json(res, 404, { error: 'stub: no such path' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`Open-Meteo stub on http://127.0.0.1:${PORT}`));
