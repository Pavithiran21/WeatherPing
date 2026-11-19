const { createHmac, timingSafeEqual } = require('node:crypto');
const { env } = require('../../config/env');

/**
 * The unsubscribe link carries "<ruleId>.<signature>", where the signature is an
 * HMAC-SHA256 of the rule id with a server secret. Nothing is stored: the server
 * can recompute the signature, and nobody without the secret can make a valid
 * token for another rule id.
 */
function sign(ruleId) {
  return createHmac('sha256', env.UNSUBSCRIBE_SECRET).update(ruleId).digest('base64url');
}

function createUnsubscribeToken(ruleId) {
  return `${ruleId}.${sign(ruleId)}`;
}

/** Returns the rule id if the token is genuine, otherwise null. */
function verifyUnsubscribeToken(token) {
  const [ruleId, signature] = String(token).split('.');
  if (!ruleId || !signature || !/^[a-f\d]{24}$/i.test(ruleId)) {
    return null;
  }

  const expected = Buffer.from(sign(ruleId));
  const given = Buffer.from(signature);
  // Constant-time comparison, so the response time doesn't reveal how much of the signature matched.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  return ruleId;
}

module.exports = { createUnsubscribeToken, verifyUnsubscribeToken };
