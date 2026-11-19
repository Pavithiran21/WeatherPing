const { parseSort, skipFor, toPage } = require('../../utils/pagination');
const { toAlertResponse } = require('./alert.mapper');
const { alertEventRepository } = require('./alertEvent.repository');

/** The user's sent alerts, newest first by default. query: { locationId?, page, size, sort? } */
async function listAlerts(userId, query) {
  const sort = parseSort(query.sort, ['createdAt', 'sentAt'], '-createdAt');
  const [events, totalItems] = await alertEventRepository.listSentForUser(
    userId,
    { locationId: query.locationId },
    { skip: skipFor(query), limit: query.size, sort },
  );
  return toPage(events.map(toAlertResponse), totalItems, query);
}

async function getUnreadCount(userId) {
  return alertEventRepository.countUnread(userId);
}

async function markAllRead(userId) {
  await alertEventRepository.markAllRead(userId);
}

module.exports = { listAlerts, getUnreadCount, markAllRead };
