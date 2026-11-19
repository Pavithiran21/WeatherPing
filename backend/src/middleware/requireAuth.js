const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../modules/auth/tokens');
const { AppError } = require('../utils/AppError');

/** Lets the request through only with a valid "Authorization: Bearer <access token>" header, and sets req.user. */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
  }

  try {
    req.user = { id: verifyAccessToken(header.slice('Bearer '.length)) };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please log in again.');
    }
    throw new AppError(401, 'TOKEN_INVALID', 'Please log in again.');
  }
  next();
}

/** The logged-in user's id, for handlers behind requireAuth. */
function currentUserId(req) {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
  }
  return req.user.id;
}

module.exports = { requireAuth, currentUserId };
