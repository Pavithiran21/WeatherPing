const { createHash, timingSafeEqual } = require('node:crypto');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

function sha256(value) {
  return createHash('sha256').update(value).digest();
}

/**
 * Protects internal job endpoints: the caller must send the X-Job-Secret header.
 * Both values are hashed first so the comparison is constant-time and equal-length.
 */
function requireJobSecret(req, _res, next) {
  const provided = req.headers['x-job-secret'];
  if (typeof provided !== 'string' || !timingSafeEqual(sha256(provided), sha256(env.JOB_TRIGGER_SECRET))) {
    throw new AppError(401, 'JOB_SECRET_INVALID', 'A valid job secret is required.');
  }
  next();
}

module.exports = { requireJobSecret };
