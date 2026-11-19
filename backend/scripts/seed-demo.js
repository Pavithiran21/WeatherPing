/**
 * Seeds one demo account per app role with data that shows its main screens. Two modes, chosen
 * by the database the env file points at; it refuses to run on any other database:
 *   weatherping_demo  drops the whole database and builds every index again (a demo from scratch,
 *                     run with ENV_FILE=.env.demo).
 *   weatherping       the normal development database: removes and recreates only the
 *                     @demo.weatherping.test users and their data, so real accounts stay.
 *
 *   Priya   user@demo.weatherping.test (the User demo account, isDemo: it can't change its
 *           password or be deleted), password = DEMO_PASSWORD, time zone Asia/Kolkata
 *           Places: Home (Chennai), Office (Bengaluru)
 *           Rules:  Home rain >= 60% 07:00-09:00, Home heat >= 38 °C 12:00-15:00,
 *                   Office AQI >= 150 18:00-21:00, Office wind >= 40 km/h 14:00-17:00 (paused)
 *           Alerts: 20 past alerts over about five weeks, the two newest unread
 *   Arun    arun@demo.weatherping.test, a normal user with one place and an active rain rule.
 *           He is "someone else": the demo ends on an unsubscribe link edited to his rule.
 *
 * Usage: npm run seed:demo   (development database, or with ENV_FILE=../.env.demo)
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { AlertEventModel } = require('../src/modules/alerts/alertEvent.model');
const { authRepository } = require('../src/modules/auth/auth.repository');
const { BCRYPT_ROUNDS } = require('../src/modules/auth/auth.service');
const { DEMO_EMAIL_DOMAIN } = require('../src/modules/demo/demoAddress');
const { DEMO_ACCOUNTS } = require('../src/modules/demo/demo.service');
const { locationRepository } = require('../src/modules/locations/location.repository');
const { notificationLogRepository } = require('../src/modules/mail/notificationLog.repository');
const { ruleRepository } = require('../src/modules/rules/rule.repository');
const { UserModel } = require('../src/modules/users/user.model');
const { userRepository } = require('../src/modules/users/user.repository');
const { pastAlert } = require('./seed-helpers');

// Load every model, so every collection gets its indexes back after the drop.
require('../src/modules/auth/passwordResetToken.model');
require('../src/modules/auth/refreshToken.model');
require('../src/modules/evaluator/jobRun.model');
require('../src/modules/locations/location.model');
require('../src/modules/mail/notificationLog.model');
require('../src/modules/rules/rule.model');
require('../src/modules/users/user.model');

const DEMO_DATABASE = 'weatherping_demo';
const DEV_DATABASE = 'weatherping';
const TIME_ZONE = 'Asia/Kolkata';
const RUN_ID = 'seed-demo';
const USER_DEMO_EMAIL = DEMO_ACCOUNTS.find((account) => account.role === 'User').email;

async function seedPriya(passwordHash) {
  const user = await userRepository.create({
    name: 'Priya',
    email: USER_DEMO_EMAIL,
    passwordHash,
    timeZone: TIME_ZONE,
    isDemo: true,
  });

  const home = await locationRepository.create({
    userId: user.id, name: 'Home', region: 'Chennai', country: 'India', latitude: 13.0878, longitude: 80.2785,
  });
  const office = await locationRepository.create({
    userId: user.id, name: 'Office', region: 'Bengaluru', country: 'India', latitude: 12.9719, longitude: 77.5937,
  });

  const rain = await ruleRepository.create({
    userId: user.id, locationId: home.id, condition: 'rain', threshold: 60, windowStart: '07:00', windowEnd: '09:00',
  });
  const heat = await ruleRepository.create({
    userId: user.id, locationId: home.id, condition: 'heat', threshold: 38, windowStart: '12:00', windowEnd: '15:00',
  });
  const aqi = await ruleRepository.create({
    userId: user.id, locationId: office.id, condition: 'aqi', threshold: 150, windowStart: '18:00', windowEnd: '21:00',
  });
  await ruleRepository.create({
    userId: user.id, locationId: office.id, condition: 'wind', threshold: 40, windowStart: '14:00', windowEnd: '17:00', status: 'paused',
  });

  // Each event is [days ago, forecast value]; at most one alert per rule per day, as the
  // unique {ruleId, eventKey} index requires. Alerts from the last two days are unread.
  const history = [
    { rule: rain, location: home, peakHour: 7, events: [[1, 80], [4, 65], [8, 90], [11, 70], [15, 75], [19, 85], [26, 60], [33, 95]] },
    { rule: aqi, location: office, peakHour: 18, events: [[2, 168], [6, 152], [10, 175], [16, 160], [21, 190], [29, 155]] },
    { rule: heat, location: home, peakHour: 13, events: [[5, 39], [9, 40], [13, 38], [17, 41], [22, 39], [30, 38]] },
  ];
  const alerts = [];
  for (const { rule, location, peakHour, events } of history) {
    for (const [daysAgo, value] of events) {
      alerts.push(pastAlert({ user, rule, location, daysAgo, peakHour, value, read: daysAgo > 2, runId: RUN_ID }));
    }
  }
  await AlertEventModel.insertMany(alerts);
  return alerts.length;
}

async function seedArun(passwordHash) {
  const user = await userRepository.create({
    name: 'Arun',
    email: `arun@${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    timeZone: TIME_ZONE,
  });
  const place = await locationRepository.create({
    userId: user.id, name: 'Velachery', region: 'Chennai', country: 'India', latitude: 12.9815, longitude: 80.218,
  });
  await ruleRepository.create({
    userId: user.id, locationId: place.id, condition: 'rain', threshold: 70, windowStart: '08:00', windowEnd: '10:00',
  });
}

/** Deletes every @demo.weatherping.test user and their data, so the seed can run again. */
async function removeDemoUsers() {
  const domainPattern = DEMO_EMAIL_DOMAIN.replaceAll('.', '\\.');
  const users = await UserModel.find({ email: new RegExp(`@${domainPattern}$`, 'i') });
  for (const user of users) {
    await AlertEventModel.deleteMany({ userId: user.id });
    await ruleRepository.deleteAllForUser(user.id);
    await locationRepository.deleteAllForUser(user.id);
    await notificationLogRepository.deleteAllForUser(user.id);
    await authRepository.deleteAllRefreshTokens(user.id);
    await authRepository.deleteAllResetTokens(user.id);
    await userRepository.deleteById(user.id);
  }
}

async function main() {
  if (!env.DEMO_PASSWORD) {
    throw new Error('Set DEMO_PASSWORD in .env first (the demo accounts use the demo-only password).');
  }

  await connectDb();
  try {
    // Only the demo database is dropped; the development database loses just the demo users.
    // The test database (or any other) is refused.
    if (mongoose.connection.name === DEMO_DATABASE) {
      // Every demo starts from an empty database.
      await mongoose.connection.dropDatabase();
      // connectDb() built the indexes before the drop, so build them again. The evaluator's
      // duplicate protection depends on the unique index on alert events.
      await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
    } else if (mongoose.connection.name === DEV_DATABASE) {
      await removeDemoUsers();
    } else {
      throw new Error(
        `seed:demo only runs on "${DEMO_DATABASE}" or "${DEV_DATABASE}", not "${mongoose.connection.name}".`,
      );
    }

    const passwordHash = await bcrypt.hash(env.DEMO_PASSWORD, BCRYPT_ROUNDS);
    const alertCount = await seedPriya(passwordHash);
    await seedArun(passwordHash);

    console.log(
      `Seeded ${mongoose.connection.name}: demo account ${USER_DEMO_EMAIL} (password = DEMO_PASSWORD): ` +
        `2 places, 4 rules (1 paused), ${alertCount} past alerts; plus arun@demo.weatherping.test.`,
    );
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
