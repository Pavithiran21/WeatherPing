const { env } = require('../../config/env');
const { AppError } = require('../../utils/AppError');
const { DEMO_EMAIL_DOMAIN } = require('./demoAddress');
const { createSession } = require('../auth/auth.service');
const { userRepository } = require('../users/user.repository');

// One demo account per app role (CLAUDE.md, "Demo accounts"). WeatherPing has one role.
// seed:demo creates these accounts; the Log in page shows one "Log in as <role>" button each.
const DEMO_ACCOUNTS = [{ role: 'User', email: `user@${DEMO_EMAIL_DOMAIN}` }];
const DEMO_ROLES = DEMO_ACCOUNTS.map((account) => account.role);

/**
 * What the Log in page shows in demo mode: each account's email and the demo-only password
 * (shown on purpose, see CLAUDE.md), plus the Ethereal inbox that receives the demo accounts'
 * emails. The password is public only because DEMO_MODE=true; the route doesn't exist otherwise.
 */
function listAccounts() {
  return {
    accounts: DEMO_ACCOUNTS.map((account) => ({ ...account, password: env.DEMO_PASSWORD })),
    inbox: env.DEMO_SMTP_USER
      ? { url: 'https://ethereal.email/login', user: env.DEMO_SMTP_USER, password: env.DEMO_SMTP_PASS }
      : null,
  };
}

/**
 * Starts a session for a role's demo account, without a password: the button on the Log in
 * page must not need one, and the frontend must never hold it. Only reachable when the backend
 * runs with DEMO_MODE=true (see routes.js). Returns { user, session }.
 */
async function loginAs(role) {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role);
  const user = await userRepository.findByEmail(account.email);
  // Only a real demo account: never a normal user who happens to have this email.
  if (!user || !user.isDemo) {
    throw new AppError(404, 'NOT_FOUND', 'The demo account is not set up. Run seed:demo first.');
  }
  return { user, session: await createSession(user.id) };
}

module.exports = { DEMO_ACCOUNTS, DEMO_ROLES, listAccounts, loginAs };
