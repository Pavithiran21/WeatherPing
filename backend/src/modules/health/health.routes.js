const { Router } = require('express');
const { isDbConnected } = require('../../db/mongoose');

const healthRouter = Router();

// Used by the start scripts and run-all-e2e to know the API is ready.
healthRouter.get('/health', (_req, res) => {
  const dbUp = isDbConnected();
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
});

module.exports = { healthRouter };
