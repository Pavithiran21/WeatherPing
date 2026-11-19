const { setRefreshCookie } = require('../auth/authCookies');
const { toUserResponse } = require('../users/user.mapper');
const { demoLoginSchema } = require('./demo.schemas');
const demoService = require('./demo.service');

function listAccounts(_req, res) {
  res.json(demoService.listAccounts());
}

/** The same answer as POST /auth/login: the refresh token in the cookie, the rest in the body. */
async function login(req, res) {
  const { role } = demoLoginSchema.parse(req.body);
  const { user, session } = await demoService.loginAs(role);
  setRefreshCookie(res, session.refreshToken);
  res.json({ user: toUserResponse(user), accessToken: session.accessToken });
}

module.exports = { listAccounts, login };
