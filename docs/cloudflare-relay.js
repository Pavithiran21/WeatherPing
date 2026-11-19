// Optional relay for Open-Meteo, a Cloudflare Worker (free plan).
//
// Free Render shares one outbound address among many apps, and Open-Meteo's free API answers that shared
// address with HTTP 429. This Worker makes the same GET request from Cloudflare instead and passes the
// JSON through. It forwards only two fixed paths, only for GET, only when the secret in the address
// matches, and Cloudflare caches each answer for 10 minutes.
//
// Deploy: Cloudflare dashboard > Workers & Pages > Create Worker > paste this file > Deploy.
// Then set, on the host that runs WeatherPing:
//   OPEN_METEO_FORECAST_URL=https://<your-worker>.workers.dev/<secret>/forecast
//   OPEN_METEO_AIR_QUALITY_URL=https://<your-worker>.workers.dev/<secret>/air-quality
// Use your own long random string as the secret, and never commit the real one.

const TOKEN = 'replace-with-a-long-random-string';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const [, token, route, ...rest] = url.pathname.split('/');
    if (request.method !== 'GET' || token !== TOKEN || rest.length > 0) {
      return new Response('Not found', { status: 404 });
    }

    let target;
    if (route === 'forecast') {
      target = 'https://api.open-meteo.com/v1/forecast';
    } else if (route === 'air-quality') {
      target = 'https://air-quality-api.open-meteo.com/v1/air-quality';
    } else {
      return new Response('Not found', { status: 404 });
    }

    const upstream = await fetch(target + url.search, {
      headers: { 'User-Agent': 'WeatherPing-relay/1.0 (portfolio demo)', Accept: 'application/json' },
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
    });
  },
};
