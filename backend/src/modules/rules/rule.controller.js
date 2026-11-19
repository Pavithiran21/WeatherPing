const { currentUserId } = require('../../middleware/requireAuth');
const { idParamsSchema } = require('../../utils/validation');
const ruleService = require('./rule.service');
const { listRulesQuerySchema, ruleChangesSchema, ruleSchema } = require('./rule.schemas');

async function list(req, res) {
  const query = listRulesQuerySchema.parse(req.query);
  res.json(await ruleService.listRules(currentUserId(req), query));
}

async function create(req, res) {
  const input = ruleSchema.parse(req.body);
  res.status(201).json(await ruleService.createRule(currentUserId(req), input));
}

async function get(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await ruleService.getRule(currentUserId(req), id));
}

async function update(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  const changes = ruleChangesSchema.parse(req.body);
  res.json(await ruleService.updateRule(currentUserId(req), id, changes));
}

async function pause(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await ruleService.setRuleStatus(currentUserId(req), id, 'paused'));
}

async function resume(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await ruleService.setRuleStatus(currentUserId(req), id, 'active'));
}

async function remove(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  await ruleService.deleteRule(currentUserId(req), id);
  res.status(204).end();
}

module.exports = { list, create, get, update, pause, resume, remove };
