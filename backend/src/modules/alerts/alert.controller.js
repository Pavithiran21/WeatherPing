const { currentUserId } = require('../../middleware/requireAuth');
const alertService = require('./alert.service');
const { listAlertsQuerySchema } = require('./alert.schemas');

async function list(req, res) {
  const query = listAlertsQuerySchema.parse(req.query);
  res.json(await alertService.listAlerts(currentUserId(req), query));
}

async function unreadCount(req, res) {
  res.json({ count: await alertService.getUnreadCount(currentUserId(req)) });
}

async function markRead(req, res) {
  await alertService.markAllRead(currentUserId(req));
  res.status(204).end();
}

module.exports = { list, unreadCount, markRead };
