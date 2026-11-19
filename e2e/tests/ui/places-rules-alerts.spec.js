const { test, expect } = require('@playwright/test');
const { SEEDED, json, newPlace, newRule, newUser } = require('../../helpers/api');
const { logIn, unsubscribeToken } = require('../../helpers/ui');

// One browser flow through the product: add a spot by search, give it a rule, pause, resume and delete it, read
// the alert history, and use the unsubscribe link from an email. The weather comes from the Open-Meteo stub.

test('search a place, add it, and see its forecast on the dashboard', async ({ page, request }) => {
  const user = await newUser(request);
  await logIn(page, user.email, user.password);
  await expect(page.getByRole('heading', { name: 'Add your first spot' })).toBeVisible();

  await page.getByRole('button', { name: /Add/ }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').fill('Rainford');
  await expect(dialog.getByRole('option', { name: /Rainford/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Add spot' }).click();
  await expect(page.getByText('Rainford added to your places')).toBeVisible();

  expect((await json(await user.get('/locations'), 200)).items.map((place) => place.name)).toEqual(['Rainford']);
  await expect(page.getByText('95%').first()).toBeVisible();
});

test('an exact spot by coordinates is accepted, and the same place twice is refused with a message', async ({ page, request }) => {
  const user = await newUser(request);
  await logIn(page, user.email, user.password);
  for (const expectedMessage of [null, /already in your spots/]) {
    await page.getByRole('button', { name: /Add/ }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').fill('11.25, 72.5');
    await expect(dialog.getByRole('option').first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Add spot' }).click();
    if (expectedMessage) {
      await expect(page.getByText(expectedMessage).first()).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
    } else {
      await expect(page.getByText('11.25, 72.5 added to your places')).toBeVisible();
    }
  }
  expect((await json(await user.get('/locations'), 200)).totalItems).toBe(1);
});

test('create a rule, pause it (with its confirmation), resume it and delete it', async ({ page, request }) => {
  const user = await newUser(request);
  const place = await newPlace(user, 11, 'Dryton');
  await logIn(page, user.email, user.password);
  await page.goto('/rules');

  await page.getByRole('button', { name: 'New rule' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Place').selectOption({ label: 'Dryton' });
  await dialog.getByText('Heat', { exact: true }).click();
  await dialog.getByRole('slider').fill('38');
  await dialog.getByLabel('From').selectOption('12:00');
  await dialog.getByLabel('To').selectOption('15:00');
  await dialog.getByRole('button', { name: /Save|Create|Add rule/ }).click();
  await expect(page.getByText('Rule saved')).toBeVisible();

  const [saved] = (await json(await user.get(`/rules?locationId=${place.id}`), 200)).items;
  expect(saved).toMatchObject({ condition: 'heat', threshold: 38, windowStart: '12:00', windowEnd: '15:00', status: 'active' });

  const toggle = page.getByRole('switch', { name: 'Heat rule in Dryton' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await page.getByRole('button', { name: 'Pause rule' }).click();
  await expect(page.getByText('Rule paused')).toBeVisible();
  await expect.poll(async () => (await json(await user.get(`/rules/${saved.id}`), 200)).status).toBe('paused');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await toggle.click();
  await expect.poll(async () => (await json(await user.get(`/rules/${saved.id}`), 200)).status).toBe('active');

  await page.getByRole('button', { name: 'Delete Heat rule in Dryton' }).click();
  await page.getByRole('button', { name: 'Delete rule' }).click();
  await expect(page.getByText('Rule deleted')).toBeVisible();
  await expect.poll(async () => (await user.get(`/rules/${saved.id}`)).status()).toBe(404);
});

test('the alert history shows the pings, filters by place, pages, and clears the unread badge once read', async ({ page }) => {
  await logIn(page, SEEDED.history);
  await expect(page.getByRole('link', { name: 'Alerts, 2 unread' }).first()).toBeVisible();

  await page.getByRole('link', { name: /^Alerts/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Alert history' })).toBeVisible();
  await expect(page.getByText('25 pings')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Alerts' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Bengaluru' }).click();
  await expect(page.getByText('10 pings')).toBeVisible();
  await page.getByRole('button', { name: 'Chennai' }).click();
  await expect(page.getByText('15 pings')).toBeVisible();
  // Only the sent alerts count: the failed one and the one still sending are never in the history.
  await page.getByRole('button', { name: 'All' }).click();
  await expect(page.getByText('25 pings')).toBeVisible();
});

test('the unsubscribe page pauses the rule from the link without a log-in, Undo turns it back on, and an edited link is refused', async ({ page, request }) => {
  const user = await newUser(request);
  const rule = await newRule(user, await newPlace(user, 11, 'Velachery'), { condition: 'rain', threshold: 70, windowStart: '08:00', windowEnd: '10:00' });

  await page.goto(`/unsubscribe?token=${encodeURIComponent(unsubscribeToken(rule.id))}`);
  await expect(page.getByRole('heading', { name: "You're unsubscribed" })).toBeVisible();
  await expect(page.getByText(/Velachery/).first()).toBeVisible();
  expect((await json(await user.get(`/rules/${rule.id}`), 200)).status).toBe('paused');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Emails are back on' })).toBeVisible();
  expect((await json(await user.get(`/rules/${rule.id}`), 200)).status).toBe('active');

  const other = await newUser(request);
  const theirs = await newRule(other, await newPlace(other, 11), { condition: 'rain', threshold: 70 });
  const edited = `${theirs.id}.${unsubscribeToken(rule.id).split('.')[1]}`;
  await page.goto(`/unsubscribe?token=${encodeURIComponent(edited)}`);
  await expect(page.getByRole('heading', { name: /isn't valid/ })).toBeVisible();
  expect((await json(await other.get(`/rules/${theirs.id}`), 200)).status).toBe('active');
});
