const { toUserResponse } = require('../users/user.mapper');
const authService = require('./auth.service');
const { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } = require('./auth.schemas');
const { clearRefreshCookie, readRefreshCookie, setRefreshCookie } = require('./authCookies');

// The refresh token goes in the cookie; the access token and user go in the body.
function sendAuthResult(res, status, { user, session }) {
  setRefreshCookie(res, session.refreshToken);
  res.status(status).json({ user: toUserResponse(user), accessToken: session.accessToken });
}

async function register(req, res) {
  const input = registerSchema.parse(req.body);
  sendAuthResult(res, 201, await authService.register(input));
}

async function login(req, res) {
  const input = loginSchema.parse(req.body);
  sendAuthResult(res, 200, await authService.login(input));
}

async function refresh(req, res) {
  try {
    sendAuthResult(res, 200, await authService.refresh(readRefreshCookie(req)));
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
}

async function logout(req, res) {
  await authService.logout(readRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(204).end();
}

async function forgotPassword(req, res) {
  const { email } = forgotPasswordSchema.parse(req.body);

  // Answer first and do the work afterwards: the same reply, in the same time,
  // whether or not the account exists.
  res.status(202).json({ message: "If that email has an account, we've sent a link to reset the password." });

  authService.forgotPassword(email).catch((error) => {
    req.log.error({ err: error }, 'Password reset request failed');
  });
}

async function resetPassword(req, res) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  res.status(204).end();
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };
