const { randomBytes } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { SEEDED, newUser } = require('../../helpers/api');
const { waitForMail } = require('../../helpers/mail');
const { logIn } = require('../../helpers/ui');

// The browser side of accounts: the signed-out redirect that remembers the page, a wrong password, sign-up and
// log-out, the one-click demo account, and the password reset with the real email.

test('a signed-out visitor is sent to Log in, and after logging in lands on the page they asked for', async ({ page, request }) => {
  const user = await newUser(request);
  await page.goto('/rules');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: /^Log in/ }).first().click();
  await expect(page).toHaveURL(/\/rules$/);
});

test('a wrong password shows one message and keeps the visitor on the log-in page', async ({ page, request }) => {
  const user = await newUser(request);
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Not-the-password-1');
  await page.getByRole('button', { name: /^Log in/ }).first().click();
  await expect(page.getByRole('alert').filter({ hasText: /doesn't match/ })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('create an account in the browser: it starts with "Add your first spot"; log out and back in', async ({ page }) => {
  const email = `ui.${randomBytes(5).toString('hex')}@e2e.weatherping.test`;
  const password = `Pw-${randomBytes(6).toString('hex')}-1`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Meera Nair');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /Create account/ }).click();
  await expect(page.getByRole('heading', { name: 'Add your first spot' })).toBeVisible();

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/rules');
  await expect(page).toHaveURL(/\/login$/);

  await logIn(page, email, password);
  await expect(page).toHaveURL(/\/rules$/);
});

test('the demo panel shows the account but no password or inbox login, and logs in as Priya with one click', async ({ page }) => {
  await page.goto('/login');
  const demo = page.getByRole('region', { name: /demo/i });
  await expect(demo).toContainText(SEEDED.demo);
  await expect(demo).not.toContainText(process.env.DEMO_PASSWORD);
  if (process.env.DEMO_SMTP_USER) await expect(demo).not.toContainText(process.env.DEMO_SMTP_USER);
  await expect(page.locator('body')).not.toContainText(/ethereal\.email|inbox password/i);
  await demo.getByRole('button', { name: /Log in as User/ }).click();
  await expect(page.getByRole('navigation', { name: 'Main' }).first()).toBeVisible();
  await expect(page.getByText('Chennai').first()).toBeVisible();
});

test('forgot password: the emailed link sets a new password that then logs in', async ({ page, request }) => {
  test.setTimeout(90_000);
  const user = await newUser(request);
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: /Send/ }).click();
  await expect(page.getByRole('status').or(page.getByText(/link is on its way|sent/i)).first()).toBeVisible();

  const mail = await waitForMail({ to: user.email, subject: /Reset your WeatherPing password/ });
  const link = mail.html.match(/href="([^"]*\/reset-password\?token=[^"]+)"/)?.[1];
  expect(link, 'reset link in the email').toBeTruthy();
  // The link points at FRONTEND_URL, which is this run's frontend.
  const { pathname, search } = new URL(link.replace(/&amp;/g, '&'));
  await page.goto(pathname + search);

  const newPassword = 'Fresh-password-42';
  await page.getByLabel('New password').fill(newPassword);
  await page.getByLabel('Confirm', { exact: false }).first().fill(newPassword);
  await page.getByRole('button', { name: /Save|Set|Reset/ }).click();
  await expect(page).toHaveURL(/\/login$/);

  await logIn(page, user.email, newPassword);
});
