const { Router } = require('express');
const { requireJobSecret } = require('../../middleware/requireJobSecret');
const { runEvaluation } = require('./evaluator.service');

// Mounted at /api/internal. Called by an external cron on hosts that sleep, and by tests.
const internalJobsRouter = Router();

internalJobsRouter.post('/jobs/evaluate', requireJobSecret, async (_req, res) => {
  const summary = await runEvaluation({ trigger: 'api' });
  res.json(summary);
});

module.exports = { internalJobsRouter };
