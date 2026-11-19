/**
 * Gets weatherping_test ready for a Playwright run, using the backend's own scripts:
 *   1. make-env.js test -> WeatherPing/.env.test (weatherping_test on the same MongoDB, the weather APIs
 *                          pointed at the local stub on :8090, new Ethereal inboxes for SMTP_* and
 *                          DEMO_SMTP_*, rate limits off, demo mode on, the scheduler parked)
 *   2. seed-e2e.js      -> empties weatherping_test, rebuilds its indexes and creates the seeded users
 *                          (password = DEMO_PASSWORD); every other test registers its own user
 *
 * Usage: npm test (runs this, then playwright test), or node prepare.js on its own.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const backend = path.resolve(__dirname, '../backend');
const envFile = path.resolve(__dirname, '../.env.test');

function run(args, { withTestEnv = true } = {}) {
  const env = { ...process.env, ...(withTestEnv ? { ENV_FILE: envFile } : {}) };
  execFileSync(process.execPath, args, { cwd: backend, env, stdio: 'inherit' });
}

run(['scripts/make-env.js', 'test', ...process.argv.slice(2)], { withTestEnv: false });
run(['scripts/seed-e2e.js']);
console.log('Ready: run "npx playwright test".');
