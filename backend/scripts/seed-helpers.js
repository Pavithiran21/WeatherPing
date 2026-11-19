/**
 * Shared by the seed scripts (seed:dev, seed:e2e and later seed:demo), so every seeded
 * alert looks like one the evaluator really wrote.
 */
const { DateTime } = require('luxon');

/**
 * The only databases a Playwright run may use, so seed:e2e can never drop the development or
 * demo database: weatherping_test. make-env.js checks it too.
 */
const TEST_DATABASES = ['weatherping_test'];

/**
 * A past alert event for one rule's window, daysAgo days back in the user's time zone,
 * "sent" the evening before. status 'failed' or 'sending' makes an event the history
 * must not show. Pass the returned objects to AlertEventModel.insertMany.
 */
function pastAlert({ user, rule, location, daysAgo, peakHour, value, read, runId, status = 'sent' }) {
  const day = DateTime.now().setZone(user.timeZone).startOf('day').minus({ days: daysAgo });
  const createdAt = day.minus({ days: 1 }).set({ hour: 19 });
  const sent = status === 'sent';
  return {
    ruleId: rule._id,
    userId: user._id,
    locationId: location._id,
    eventKey: day.toISODate(),
    locationName: location.name,
    condition: rule.condition,
    threshold: rule.threshold,
    windowStart: rule.windowStart,
    windowEnd: rule.windowEnd,
    forecastValue: value,
    forecastTime: day.set({ hour: peakHour }).toJSDate(),
    status,
    sentAt: sent ? createdAt.toJSDate() : null,
    readAt: sent && read ? createdAt.plus({ hours: 2 }).toJSDate() : null,
    runId,
    createdAt: createdAt.toJSDate(),
  };
}

module.exports = { pastAlert, TEST_DATABASES };
