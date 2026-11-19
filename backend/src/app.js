const { randomUUID } = require('node:crypto');
const path = require('node:path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { pinoHttp } = require('pino-http');
const { env } = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiRouter } = require('./routes');
const { logger } = require('./utils/logger');

const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/;

/**
 * The built frontend: hashed files under /assets are cached for a year, and any other GET that
 * isn't a file, an /api route or an asset gets index.html so React Router can show the page
 * (unknown /api routes and missing assets still get the JSON 404). The page CSP is helmet's strict
 * default plus blob: images (brand images), without upgrade-insecure-requests so a plain-http local run (docker compose) works too.
 */
function serveFrontend(app, folder) {
  const root = path.resolve(folder);
  const pageCsp = helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:', 'blob:'],
      'upgrade-insecure-requests': null,
    },
  });
  app.use('/assets', express.static(path.join(root, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(root, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    const isPage = (req.method === 'GET' || req.method === 'HEAD') && !/^\/(api|assets)(\/|$)/.test(req.path);
    if (!isPage) return next();
    pageCsp(req, res, () => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(root, 'index.html'));
    });
  });
}

// Builds the Express app without starting it; server.js connects to the database and listens.
function createApp() {
  const app = express();

  // req.ip is the rate limiters' key. By default X-Forwarded-For is believed only when it comes
  // from this machine (the Vite dev proxy, the Playwright run), so a remote client can't pick its
  // own IP by sending the header. Behind a host's proxy, TRUST_PROXY is its number of hops.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      // Reuse the caller's X-Request-Id if it looks safe, otherwise make one.
      // It is returned in the response header and in every error body.
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      // Log only the method, path and status: no headers, IPs, bodies or query strings
      // (a place search such as ?q=<street name> can reveal where someone lives).
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, path: req.url.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api', apiRouter);
  if (env.STATIC_DIR) {
    serveFrontend(app, env.STATIC_DIR);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
