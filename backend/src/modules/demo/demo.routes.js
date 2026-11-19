const { Router } = require('express');
const { loginIpLimiter } = require('../../middleware/rateLimiters');
const demoController = require('./demo.controller');

// Public, mounted at /api/demo only when DEMO_MODE=true (see routes.js). Otherwise these
// routes don't exist, so they answer 404 and the Log in page shows no demo buttons.
const demoRouter = Router();

demoRouter.get('/', demoController.listAccounts);
demoRouter.post('/login', loginIpLimiter, demoController.login);

module.exports = { demoRouter };
