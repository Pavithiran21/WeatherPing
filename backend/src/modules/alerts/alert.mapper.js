const { describeRule } = require('../rules/conditions');

function toAlertResponse(event) {
  return {
    id: event.id,
    ruleId: event.ruleId.toString(),
    locationId: event.locationId.toString(),
    locationName: event.locationName,
    condition: event.condition,
    threshold: event.threshold,
    windowStart: event.windowStart,
    windowEnd: event.windowEnd,
    // Local date of the window in the user's time zone, for example "2026-10-21".
    eventDate: event.eventKey,
    forecastValue: event.forecastValue,
    forecastTime: event.forecastTime,
    summary: describeRule(event),
    sentAt: event.sentAt,
    read: event.readAt !== null,
  };
}

module.exports = { toAlertResponse };
