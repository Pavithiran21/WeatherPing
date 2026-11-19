const { unsubscribeBodySchema } = require('./unsubscribe.schemas');
const { setRuleStatusFromLink } = require('./unsubscribe.service');

async function unsubscribe(req, res) {
  const { token } = unsubscribeBodySchema.parse(req.body);
  res.json(await setRuleStatusFromLink(token, 'paused'));
}

async function undo(req, res) {
  const { token } = unsubscribeBodySchema.parse(req.body);
  res.json(await setRuleStatusFromLink(token, 'active'));
}

module.exports = { unsubscribe, undo };
