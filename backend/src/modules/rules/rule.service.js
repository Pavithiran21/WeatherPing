const { notFound } = require('../../utils/AppError');
const { parseSort, skipFor, toPage } = require('../../utils/pagination');
const { getOwnedLocation } = require('../locations/location.service');
const { toRuleResponse } = require('./rule.mapper');
const { ruleRepository } = require('./rule.repository');
const { ruleSchema } = require('./rule.schemas');

async function getOwnedRule(userId, ruleId) {
  const rule = await ruleRepository.findOwned(userId, ruleId);
  if (!rule) {
    throw notFound('Rule');
  }
  return rule;
}

/** filter: { locationId?, status? } plus page, size, sort. */
async function listRules(userId, query) {
  const sort = parseSort(query.sort, ['createdAt', 'condition'], 'createdAt');
  const [rules, totalItems] = await ruleRepository.listOwned(
    userId,
    { locationId: query.locationId, status: query.status },
    { skip: skipFor(query), limit: query.size, sort },
  );
  return toPage(rules.map(toRuleResponse), totalItems, query);
}

/** input: { locationId, condition, threshold, windowStart, windowEnd }, already validated. */
async function createRule(userId, input) {
  // The place must be the user's own; another user's place is "not found".
  await getOwnedLocation(userId, input.locationId);
  const rule = await ruleRepository.create({ userId, ...input });
  return toRuleResponse(rule);
}

async function getRule(userId, ruleId) {
  return toRuleResponse(await getOwnedRule(userId, ruleId));
}

/** changes: any subset of the rule fields. */
async function updateRule(userId, ruleId, changes) {
  const rule = await getOwnedRule(userId, ruleId);

  // Validate the rule as it will be after the change, so for example a new condition
  // is checked against its own threshold range.
  const updated = ruleSchema.parse({
    locationId: rule.locationId.toString(),
    condition: rule.condition,
    threshold: rule.threshold,
    windowStart: rule.windowStart,
    windowEnd: rule.windowEnd,
    ...changes,
  });
  if (changes.locationId) {
    await getOwnedLocation(userId, updated.locationId);
  }

  const saved = await ruleRepository.updateOwned(userId, ruleId, updated);
  if (!saved) {
    throw notFound('Rule');
  }
  return toRuleResponse(saved);
}

/** Pause or resume. Setting the status it already has is fine (idempotent). */
async function setRuleStatus(userId, ruleId, status) {
  const saved = await ruleRepository.updateOwned(userId, ruleId, { status });
  if (!saved) {
    throw notFound('Rule');
  }
  return toRuleResponse(saved);
}

async function deleteRule(userId, ruleId) {
  const deleted = await ruleRepository.deleteOwned(userId, ruleId);
  if (!deleted) {
    throw notFound('Rule');
  }
}

module.exports = { listRules, createRule, getRule, updateRule, setRuleStatus, deleteRule };
