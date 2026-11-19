const { Router } = require('express');
const { env } = require('./config/env');
const { requireAuth } = require('./middleware/requireAuth');
const { alertRouter } = require('./modules/alerts/alert.routes');
const { authRouter } = require('./modules/auth/auth.routes');
const { demoRouter } = require('./modules/demo/demo.routes');
const { internalJobsRouter } = require('./modules/evaluator/evaluator.routes');
const { healthRouter } = require('./modules/health/health.routes');
const { locationRouter } = require('./modules/locations/location.routes');
const { ruleRouter } = require('./modules/rules/rule.routes');
const { unsubscribeRouter } = require('./modules/unsubscribe/unsubscribe.routes');
const { profileRouter } = require('./modules/users/profile.routes');

// Every API route is mounted here, under /api (see app.js).
const apiRouter = Router();

// Public
apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/unsubscribe', unsubscribeRouter);
// "Log in as <role>" buttons: demos only (DEMO_MODE=true), never a normal run.
if (env.DEMO_MODE) {
  apiRouter.use('/demo', demoRouter);
}

// Logged-in user only
apiRouter.use('/me', requireAuth, profileRouter);
apiRouter.use('/locations', requireAuth, locationRouter);
apiRouter.use('/rules', requireAuth, ruleRouter);
apiRouter.use('/alerts', requireAuth, alertRouter);

// Internal jobs: protected by the X-Job-Secret header, not by a user login
apiRouter.use('/internal', internalJobsRouter);

module.exports = { apiRouter };
