const { AppError, notFound } = require('../../utils/AppError');
const { locationRepository } = require('../locations/location.repository');
const { describeRule } = require('../rules/conditions');
const { ruleRepository } = require('../rules/rule.repository');
const { verifyUnsubscribeToken } = require('./unsubscribeToken');

/**
 * Pauses ('paused') or resumes ('active') the rule named by a signed unsubscribe token.
 * No login: the token can only have come from the email we sent for that rule.
 * Returns what the Unsubscribe page shows: the rule and place, never any account details.
 */
async function setRuleStatusFromLink(token, status) {
  const ruleId = verifyUnsubscribeToken(token);
  if (!ruleId) {
    throw new AppError(400, 'UNSUBSCRIBE_LINK_INVALID', "This unsubscribe link isn't valid. Log in to manage your rules.");
  }

  const rule = await ruleRepository.setStatusById(ruleId, status);
  if (!rule) {
    throw notFound('Rule');
  }

  const location = await locationRepository.findById(rule.locationId);
  return {
    ruleId: rule.id,
    status: rule.status,
    summary: describeRule(rule),
    locationName: location ? location.name : null,
  };
}

module.exports = { setRuleStatusFromLink };
