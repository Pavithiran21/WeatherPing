const { createHmac } = require('node:crypto');
const { expect } = require('@playwright/test');

/** Logs in on /login and waits until the app shell (the Main navigation) is showing. */
async function logIn(page, email, password = process.env.DEMO_PASSWORD) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^Log in/ }).first().click();
  await expect(page.getByRole('navigation', { name: 'Main' }).first()).toBeVisible();
}

/** A genuine unsubscribe token for a rule: "<ruleId>.<HMAC-SHA256 of it with UNSUBSCRIBE_SECRET>". */
function unsubscribeToken(ruleId) {
  return `${ruleId}.${createHmac('sha256', process.env.UNSUBSCRIBE_SECRET).update(ruleId).digest('base64url')}`;
}

module.exports = { logIn, unsubscribeToken };
