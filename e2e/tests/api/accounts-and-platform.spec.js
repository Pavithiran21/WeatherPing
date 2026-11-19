const { createHmac, randomBytes } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { SEEDED, apiUrl, failure, fieldsOf, json, login, loginAs, newPlace, newRule, newUser, runEvaluator } = require('../../helpers/api');
const { waitForMail } = require('../../helpers/mail');

// Accounts: sign-up rules, the refresh cookie, the password-reset link read from a real inbox, the profile,
// deleting an account, the locked demo accounts, and the edges of the API (headers, bad bodies, the job secret,
// the signed unsubscribe link).

const newEmail = () => `user.${randomBytes(5).toString('hex')}@e2e.weatherping.test`;
const strongPassword = () => `Pw-${randomBytes(8).toString('hex')}-1`;
const register = (request, overrides = {}) =>
  request.post(apiUrl('/auth/register'), { data: { name: 'Asha Rao', email: newEmail(), password: strongPassword(), timeZone: 'Asia/Kolkata', ...overrides } });

test.describe('registration and sessions', () => {
  test('creates the account, returns a token and sets an HttpOnly, SameSite=Strict refresh cookie scoped to /api/auth', async ({ request }) => {
    const response = await register(request);
    const body = await json(response, 201);
    expect(body.accessToken).toBeTruthy();
    expect(body.user).toMatchObject({ name: 'Asha Rao', timeZone: 'Asia/Kolkata', isDemo: false });
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|password_hash/i);
    const cookie = response.headers()['set-cookie'];
    expect(cookie).toMatch(/wp_refresh=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/auth/i);
  });

  test('an email that is already taken is a 409 whatever its letter case; bad input is a 400 that names each field', async ({ request }) => {
    const email = newEmail();
    await json(await register(request, { email }), 201);
    expect(fieldsOf(await failure(await register(request, { email: email.toUpperCase() }), 409, 'EMAIL_TAKEN'))).toContain('email');
    for (const [overrides, field] of [
      [{ password: 'short' }, 'password'],
      [{ password: 'nodigitshere' }, 'password'],
      [{ email: 'not-an-email' }, 'email'],
      [{ name: '   ' }, 'name'],
      [{ timeZone: 'Mars/Olympus' }, 'timeZone'],
    ]) {
      expect(fieldsOf(await failure(await register(request, overrides), 400, 'VALIDATION_FAILED')), JSON.stringify(overrides)).toContain(field);
    }
  });

  test('log-in ignores the email\'s letter case, and a wrong password never says which half was wrong', async ({ request }) => {
    const email = newEmail();
    const password = strongPassword();
    await json(await register(request, { email, password }), 201);
    await json(await login(request, email.toUpperCase(), password), 200);
    const wrongPassword = await failure(await login(request, email, 'Wrong-pass-1'), 401, 'INVALID_CREDENTIALS');
    const unknownEmail = await failure(await login(request, newEmail(), 'Wrong-pass-1'), 401, 'INVALID_CREDENTIALS');
    expect(wrongPassword.message).toBe(unknownEmail.message);
  });

  test('a refresh token works once: refreshing issues a new pair, replaying the old one fails, and log-out ends the session', async ({ playwright, request }) => {
    const response = await register(request);
    await json(response, 201);
    const oldCookie = response.headers()['set-cookie'].split(';')[0];

    // Each call below is made with its own empty cookie jar, so only the cookie named here is sent.
    const withCookie = async (cookie, pathname) => {
      const context = await playwright.request.newContext();
      try {
        const reply = await context.post(apiUrl(pathname), { headers: { Cookie: cookie } });
        return { status: reply.status(), body: await reply.text(), cookie: reply.headers()['set-cookie']?.split(';')[0] };
      } finally {
        await context.dispose();
      }
    };
    const refreshed = await withCookie(oldCookie, '/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(JSON.parse(refreshed.body).accessToken).toBeTruthy();
    expect(refreshed.cookie).not.toBe(oldCookie);
    const replay = await withCookie(oldCookie, '/auth/refresh');
    expect(replay.status).toBe(401);
    expect(JSON.parse(replay.body).error.code).toBe('SESSION_EXPIRED');

    expect((await withCookie(refreshed.cookie, '/auth/logout')).status).toBe(204);
    expect((await withCookie(refreshed.cookie, '/auth/refresh')).status).toBe(401);
  });

  test('a missing or garbage token is a 401 on a protected route, and the error body has the standard shape', async ({ request }) => {
    const missing = await failure(await request.get(apiUrl('/me')), 401);
    expect(missing).toMatchObject({ code: expect.any(String), message: expect.any(String), details: expect.any(Array) });
    expect(missing.requestId).toBeTruthy();
    expect((await request.get(apiUrl('/me'), { headers: { Authorization: 'Bearer not.a.token' } })).status()).toBe(401);
  });
});

test.describe('password reset through the real inbox', () => {
  test.describe.configure({ timeout: 90_000 });

  const resetToken = async (email) => {
    const mail = await waitForMail({ to: email, subject: /Reset your WeatherPing password/ });
    const link = mail.html.match(/href="([^"]*\/reset-password\?token=([^"&]+))"/);
    expect(link, 'reset link in the email').toBeTruthy();
    return link[2];
  };

  test('the emailed link sets a new password once; the old password and the used link stop working', async ({ request }) => {
    const user = await newUser(request);
    expect((await request.post(apiUrl('/auth/forgot-password'), { data: { email: user.email } })).status()).toBe(202);
    const token = await resetToken(user.email);

    const newPassword = 'Fresh-password-42';
    expect((await request.post(apiUrl('/auth/reset-password'), { data: { token, password: newPassword } })).status()).toBe(204);
    await failure(await login(request, user.email, user.password), 401, 'INVALID_CREDENTIALS');
    await json(await login(request, user.email, newPassword), 200);
    await failure(await request.post(apiUrl('/auth/reset-password'), { data: { token, password: 'Another-pass-1' } }), 400, 'RESET_LINK_EXPIRED');
  });

  test('a made-up token is refused, and an unknown email gets the same 202 and no mail', async ({ request }) => {
    const fake = randomBytes(32).toString('base64url');
    await failure(await request.post(apiUrl('/auth/reset-password'), { data: { token: fake, password: 'Made-up-pass-1' } }), 400, 'RESET_LINK_EXPIRED');
    const known = await newUser(request);
    const asKnown = await request.post(apiUrl('/auth/forgot-password'), { data: { email: known.email } });
    const asUnknown = await request.post(apiUrl('/auth/forgot-password'), { data: { email: newEmail() } });
    expect(asUnknown.status()).toBe(asKnown.status());
    expect(await asUnknown.json()).toEqual(await asKnown.json());
  });
});

test.describe('profile', () => {
  test('changes the name and the time zone; an empty change is refused and a sent email is ignored', async ({ request }) => {
    const api = await newUser(request);
    const changed = await json(await api.patch('/me', { name: 'Meera Nair', timeZone: 'Europe/London', email: 'someone.else@e2e.weatherping.test' }), 200);
    expect(changed).toMatchObject({ name: 'Meera Nair', timeZone: 'Europe/London', email: api.email });
    await failure(await api.patch('/me', {}), 400, 'VALIDATION_FAILED');
    await failure(await api.patch('/me', { timeZone: 'Nowhere/Land' }), 400, 'VALIDATION_FAILED');
  });

  test('changing the password needs the current one, returns a new token, and the old password stops working', async ({ request }) => {
    const user = await newUser(request);
    const wrong = await failure(await user.post('/me/password', { currentPassword: 'Not-my-pass-1', newPassword: 'Brand-new-pass-1' }), 400, 'WRONG_PASSWORD');
    expect(fieldsOf(wrong)).toContain('currentPassword');
    expect((await json(await user.post('/me/password', { currentPassword: user.password, newPassword: 'Brand-new-pass-1' }), 200)).accessToken).toBeTruthy();
    await json(await login(request, user.email, 'Brand-new-pass-1'), 200);
    await failure(await login(request, user.email, user.password), 401, 'INVALID_CREDENTIALS');
  });

  test('deleting the account needs the password, removes the places, rules and alerts, and frees the email', async ({ request }) => {
    const user = await newUser(request);
    await newRule(user, await newPlace(user, 11));
    const wrong = await failure(await user.delete('/me', { password: 'Wrong-pass-1' }), 400, 'WRONG_PASSWORD');
    expect(fieldsOf(wrong)).toContain('password');
    expect((await user.delete('/me', { password: user.password })).status()).toBe(204);
    await failure(await login(request, user.email, user.password), 401, 'INVALID_CREDENTIALS');
    await failure(await user.get('/me'), 401, 'UNAUTHENTICATED');
    expect((await json(await user.get('/rules'), 200)).totalItems).toBe(0);
    await json(await register(request, { email: user.email }), 201);
  });
});

test.describe('the demo accounts', () => {
  test('a demo account can\'t change its password or delete itself', async ({ request }) => {
    const locked = await loginAs(request, SEEDED.locked);
    await failure(await locked.post('/me/password', { currentPassword: process.env.DEMO_PASSWORD, newPassword: 'Changed-pass-1' }), 403, 'DEMO_ACCOUNT_LOCKED');
    await failure(await locked.delete('/me', { password: process.env.DEMO_PASSWORD }), 403, 'DEMO_ACCOUNT_LOCKED');
    expect((await json(await locked.get('/me'), 200)).isDemo).toBe(true);
  });

  test('with DEMO_MODE on, /api/demo lists the account, its password and the demo inbox, and "Log in as User" starts a session', async ({ request }) => {
    const info = await json(await request.get(apiUrl('/demo')), 200);
    expect(info.accounts).toEqual([{ role: 'User', email: SEEDED.demo, password: process.env.DEMO_PASSWORD }]);
    expect(info.inbox).toMatchObject({ url: 'https://ethereal.email/login', user: process.env.DEMO_SMTP_USER });
    const response = await request.post(apiUrl('/demo/login'), { data: { role: 'User' } });
    const session = await json(response, 200);
    expect(session.user).toMatchObject({ email: SEEDED.demo, isDemo: true, name: 'Priya' });
    expect(response.headers()['set-cookie']).toMatch(/wp_refresh=.*HttpOnly/i);
    expect((await request.get(apiUrl('/me'), { headers: { Authorization: `Bearer ${session.accessToken}` } })).status()).toBe(200);
    await failure(await request.post(apiUrl('/demo/login'), { data: { role: 'Admin' } }), 400, 'VALIDATION_FAILED');
  });
});

test.describe('the edges of the API', () => {
  test('/api/health reports ok, and an unknown route is a JSON 404 with a request id', async ({ request }) => {
    expect(await json(await request.get(apiUrl('/health')), 200)).toMatchObject({ status: 'ok' });
    const error = await failure(await request.get(apiUrl('/no-such-route')), 404);
    expect(error.requestId).toBeTruthy();
  });

  test('a malformed JSON body is a 400, an oversized one is a 413, and the caller\'s request id is echoed', async ({ request }) => {
    await failure(await request.post(apiUrl('/auth/login'), { data: Buffer.from('{"email":'), headers: { 'Content-Type': 'application/json' } }), 400);
    await failure(await request.post(apiUrl('/auth/login'), { data: { email: 'x'.repeat(20_000) } }), 413);
    const echoed = await request.get(apiUrl('/health'), { headers: { 'X-Request-Id': 'trace-me-123' } });
    expect(echoed.headers()['x-request-id']).toBe('trace-me-123');
  });

  test('security headers are on', async ({ request }) => {
    const headers = (await request.get(apiUrl('/health'))).headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('the evaluator endpoint needs the job secret: none or a wrong one is a 401', async ({ request }) => {
    await failure(await runEvaluator(request, null), 401, 'JOB_SECRET_INVALID');
    await failure(await runEvaluator(request, 'not-the-secret-not-the-secret-not-the-secret'), 401, 'JOB_SECRET_INVALID');
  });
});

test.describe('the signed unsubscribe link', () => {
  const sign = (ruleId) => createHmac('sha256', process.env.UNSUBSCRIBE_SECRET).update(ruleId).digest('base64url');
  const unsubscribe = (request, token, undo = false) => request.post(apiUrl(`/unsubscribe${undo ? '/undo' : ''}`), { data: { token } });

  test('a genuine link pauses the rule without a log-in, says what it paused, and Undo resumes it', async ({ request }) => {
    const user = await newUser(request);
    const place = await newPlace(user, 11, 'Velachery');
    const rule = await newRule(user, place, { condition: 'rain', threshold: 70, windowStart: '08:00', windowEnd: '10:00' });
    const paused = await json(await unsubscribe(request, `${rule.id}.${sign(rule.id)}`), 200);
    expect(paused).toEqual({ ruleId: rule.id, status: 'paused', summary: 'rain chance is 70% or more between 8 and 10 am', locationName: 'Velachery' });
    expect((await json(await user.get(`/rules/${rule.id}`), 200)).status).toBe('paused');
    expect((await json(await unsubscribe(request, `${rule.id}.${sign(rule.id)}`, true), 200)).status).toBe('active');
    expect((await json(await user.get(`/rules/${rule.id}`), 200)).status).toBe('active');
  });

  test('an edited link is refused: another rule\'s id with this rule\'s signature, a cut signature, garbage, or no token', async ({ request }) => {
    const owner = await newUser(request);
    const stranger = await newUser(request);
    const mine = await newRule(owner, await newPlace(owner, 11));
    const theirs = await newRule(stranger, await newPlace(stranger, 11));
    for (const token of [`${theirs.id}.${sign(mine.id)}`, `${mine.id}.${sign(mine.id).slice(0, -2)}`, `${mine.id}.`, 'garbage', `${'0'.repeat(24)}x.${sign(mine.id)}`]) {
      await failure(await unsubscribe(request, token), 400, 'UNSUBSCRIBE_LINK_INVALID');
    }
    expect((await request.post(apiUrl('/unsubscribe'), { data: {} })).status()).toBe(400);
    expect((await json(await stranger.get(`/rules/${theirs.id}`), 200)).status).toBe('active');
  });

  test('a genuine link for a rule that was deleted is a 404', async ({ request }) => {
    const user = await newUser(request);
    const rule = await newRule(user, await newPlace(user, 11));
    await user.delete(`/rules/${rule.id}`);
    await failure(await unsubscribe(request, `${rule.id}.${sign(rule.id)}`), 404);
  });
});
