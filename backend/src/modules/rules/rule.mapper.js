const { describeRule } = require('./conditions');

function toRuleResponse(rule) {
  return {
    id: rule.id,
    locationId: rule.locationId.toString(),
    condition: rule.condition,
    threshold: rule.threshold,
    windowStart: rule.windowStart,
    windowEnd: rule.windowEnd,
    status: rule.status,
    summary: describeRule(rule),
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

module.exports = { toRuleResponse };
