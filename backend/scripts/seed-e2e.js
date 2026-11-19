/**
 * Resets the Playwright test database before a run: drops weatherping_test, builds every index again and creates the seeded test users. Refuses to run
 * on any other database.
 *
 *   Users (password = DEMO_PASSWORD from .env, time zone Asia/Kolkata):
 *     user@e2e.weatherping.test     login, refresh, log out and forgot-password specs
 *     reset@e2e.weatherping.test    password reset spec (its password changes during the run)
 *     demo@e2e.weatherping.test     a demo account (cannot change its password or be deleted)
 *     delete@e2e.weatherping.test   Chennai, a rain rule and 2 alerts; deleted by the profile spec
 *     alerts@e2e.weatherping.test   Chennai and Bengaluru, a rule on each, 25 sent alerts (the 2
 *                                   newest unread) plus 1 failed and 1 still "sending", which
 *                                   the history must never show; used by the API alerts spec
 *     history@e2e.weatherping.test  the same history as alerts@, for the browser alerts spec (the
 *                                   API spec marks alerts@'s alerts read, and the specs may run
 *                                   in any order)
 *     owner@e2e.weatherping.test    Chennai, a rain rule and 2 unread alerts; the ownership
 *                                   spec checks nobody else can reach them
 *     user@demo.weatherping.test    Priya, the account behind "Log in as User" (DEMO_MODE=true): a place,
 *                                   a paused rain rule and 2 unread alerts
 *
 * Alerts are written directly, as the evaluator would have written them, so these specs
 * don't depend on an evaluator run (that has its own spec). The seeded rules are paused:
 * every evaluator run checks every active rule in the database, and the evaluator spec's
 * runs must not add alerts to the fixed histories the other specs count.
 * Specs that change their user in other ways register their own, so the seeded users stay usable.
 * Usage: npm run seed:e2e with ENV_FILE=../.env.test (scripts/e2e.ps1 does both)
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { AlertEventModel } = require('../src/modules/alerts/alertEvent.model');
const { BCRYPT_ROUNDS } = require('../src/modules/auth/auth.service');
const { locationRepository } = require('../src/modules/locations/location.repository');
const { ruleRepository } = require('../src/modules/rules/rule.repository');
const { userRepository } = require('../src/modules/users/user.repository');
const { pastAlert, TEST_DATABASES } = require('./seed-helpers');

// Load every model, so every collection gets its indexes back after the drop.
require('../src/modules/alerts/alertEvent.model');
require('../src/modules/auth/passwordResetToken.model');
require('../src/modules/auth/refreshToken.model');
require('../src/modules/evaluator/jobRun.model');
require('../src/modules/locations/location.model');
require('../src/modules/mail/notificationLog.model');
require('../src/modules/rules/rule.model');
require('../src/modules/users/user.model');

const TIME_ZONE = 'Asia/Kolkata';
const RUN_ID = 'seed-e2e';

const CHENNAI = { name: 'Chennai', region: 'Tamil Nadu', country: 'India', latitude: 13.0878, longitude: 80.2785 };
const BENGALURU = { name: 'Bengaluru', region: 'Karnataka', country: 'India', latitude: 12.9719, longitude: 77.5937 };
const RAIN_RULE = { condition: 'rain', threshold: 60, windowStart: '07:00', windowEnd: '09:00', status: 'paused' };
const AQI_RULE = { condition: 'aqi', threshold: 150, windowStart: '17:00', windowEnd: '21:00', status: 'paused' };

/** Creates a user with a place and a rule on it. Returns { user, location, rule }. */
async function userWithRule(user, place, ruleFields) {
  const location = await locationRepository.create({ userId: user.id, ...place });
  const rule = await ruleRepository.create({ userId: user.id, locationId: location.id, ...ruleFields });
  return { user, location, rule };
}

/** Unread rain alerts for the given days ago. */
function unreadRainAlerts({ user, location, rule }, days) {
  return days.map((daysAgo) =>
    pastAlert({ user, rule, location, daysAgo, peakHour: 7, value: 60 + daysAgo, read: false, runId: RUN_ID }),
  );
}

/**
 * Alert history for one user: 15 rain alerts in Chennai and 10 AQI alerts in Bengaluru, one
 * per rule per day; only the newest day (1 day ago) is unread. Plus two that were never sent.
 */
async function alertHistory(user) {
  const chennaiRain = await userWithRule(user, CHENNAI, RAIN_RULE);
  const bengaluruAqi = await userWithRule(user, BENGALURU, AQI_RULE);
  const history = [];
  for (let daysAgo = 1; daysAgo <= 15; daysAgo += 1) {
    history.push(pastAlert({ ...chennaiRain, daysAgo, peakHour: 7, value: 60 + daysAgo, read: daysAgo > 1, runId: RUN_ID }));
  }
  for (let daysAgo = 1; daysAgo <= 10; daysAgo += 1) {
    history.push(pastAlert({ ...bengaluruAqi, daysAgo, peakHour: 18, value: 150 + daysAgo * 4, read: daysAgo > 1, runId: RUN_ID }));
  }
  history.push(pastAlert({ ...chennaiRain, daysAgo: 20, peakHour: 7, value: 90, read: false, runId: RUN_ID, status: 'failed' }));
  history.push(pastAlert({ ...bengaluruAqi, daysAgo: 20, peakHour: 18, value: 200, read: false, runId: RUN_ID, status: 'sending' }));
  return history;
}

async function main() {
  if (!env.DEMO_PASSWORD) {
    throw new Error('Set DEMO_PASSWORD in .env first (the test users use the demo-only password).');
  }

  await connectDb();
  try {
    // Never wipe the development or demo database by mistake.
    const databaseName = mongoose.connection.name;
    if (!TEST_DATABASES.includes(databaseName)) {
      throw new Error(`seed:e2e only runs on a test database (${TEST_DATABASES.join(' or ')}), not "${databaseName}".`);
    }

    await mongoose.connection.dropDatabase();
    // connectDb() built the indexes before the drop, so build them again. The evaluator's
    // duplicate protection depends on the unique index on alert events.
    await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));

    const passwordHash = await bcrypt.hash(env.DEMO_PASSWORD, BCRYPT_ROUNDS);
    const createUser = (name, email, isDemo = false) =>
      userRepository.create({ name, email, passwordHash, timeZone: TIME_ZONE, isDemo });

    await createUser('Asha', 'user@e2e.weatherping.test');
    await createUser('Ravi', 'reset@e2e.weatherping.test');
    await createUser('Deepa', 'demo@e2e.weatherping.test', true);

    const toDelete = await userWithRule(await createUser('Dinesh', 'delete@e2e.weatherping.test'), CHENNAI, RAIN_RULE);
    const owner = await userWithRule(await createUser('Arjun', 'owner@e2e.weatherping.test'), CHENNAI, RAIN_RULE);

    const demo = await userWithRule(await createUser('Priya', 'user@demo.weatherping.test', true), CHENNAI, RAIN_RULE);

    const apiHistory = await alertHistory(await createUser('Lakshmi', 'alerts@e2e.weatherping.test'));
    const browserHistory = await alertHistory(await createUser('Kavya', 'history@e2e.weatherping.test'));

    const alerts = [
      ...apiHistory,
      ...browserHistory,
      ...unreadRainAlerts(toDelete, [1, 2]),
      ...unreadRainAlerts(owner, [1, 2]),
      ...unreadRainAlerts(demo, [1, 2]),
    ];
    await AlertEventModel.insertMany(alerts);

    console.log(`Reset ${databaseName}: 8 test users (password = DEMO_PASSWORD), ${alerts.length} alert events.`);
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
