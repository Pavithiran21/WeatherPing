const { Router } = require('express');
const { unsubscribeLimiter } = require('../../middleware/rateLimiters');
const unsubscribeController = require('./unsubscribe.controller');

// Public (no login), mounted at /api/unsubscribe. POST, not GET: email scanners open
// GET links by themselves and would unsubscribe people by accident. The email links to
// a frontend page, and that page makes this POST.
const unsubscribeRouter = Router();

unsubscribeRouter.post('/', unsubscribeLimiter, unsubscribeController.unsubscribe);
unsubscribeRouter.post('/undo', unsubscribeLimiter, unsubscribeController.undo);

module.exports = { unsubscribeRouter };
