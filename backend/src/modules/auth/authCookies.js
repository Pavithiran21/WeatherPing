const { env } = require('../../config/env');
const { REFRESH_TOKEN_TTL_MS } = require('./tokens');

const REFRESH_COOKIE = 'wp_refresh';

// HTTP-only: page scripts cannot read it. SameSite=Strict: other sites cannot make the
// browser send it (CSRF). Path: sent only to the auth endpoints that need it.
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshCookieOptions, maxAge: REFRESH_TOKEN_TTL_MS });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
}

function readRefreshCookie(req) {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

module.exports = { setRefreshCookie, clearRefreshCookie, readRefreshCookie };
