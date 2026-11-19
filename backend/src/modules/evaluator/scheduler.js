const cron = require('node-cron');
const { env } = require('../../config/env');
const { logger } = require('../../utils/logger');
const { runEvaluation } = require('./evaluator.service');

/**
 * Runs the evaluator on the EVALUATOR_CRON schedule inside the API process.
 * Overlapping runs are allowed on purpose: the unique index on alert events keeps
 * them safe, so no lock is needed. (On a free host that sleeps, an external
 * cron calls POST /api/internal/jobs/evaluate instead.)
 */
function startEvaluatorSchedule() {
  if (!cron.validate(env.EVALUATOR_CRON)) {
    throw new Error('EVALUATOR_CRON is not a valid cron expression');
  }

  const task = cron.schedule(env.EVALUATOR_CRON, () => {
    // runEvaluation logs its own failures; this catch only stops an unhandled rejection.
    runEvaluation({ trigger: 'schedule' }).catch(() => {});
  });
  logger.info({ schedule: env.EVALUATOR_CRON }, 'Evaluator scheduled');
  return task;
}

module.exports = { startEvaluatorSchedule };
