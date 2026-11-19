const { Router } = require('express');
const alertController = require('./alert.controller');

// Mounted at /api/alerts behind requireAuth.
const alertRouter = Router();

alertRouter.get('/', alertController.list);
alertRouter.get('/unread-count', alertController.unreadCount);
alertRouter.post('/mark-read', alertController.markRead);

module.exports = { alertRouter };
