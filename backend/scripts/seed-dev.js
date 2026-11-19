/**
 * Seeds the development database with one user and realistic data, so every screen has
 * something to show. Safe to re-run: it removes and recreates only this one user.
 *
 *   User:   dev@weatherping.test (password = DEMO_PASSWORD from .env), time zone Asia/Kolkata
 *   Places: Chennai (home), Bengaluru (office)
 *   Rules:  Chennai rain >= 60% 07:00-09:00, Chennai heat >= 33 °C 12:00-15:00,
 *           Bengaluru AQI >= 150 17:00-21:00, Bengaluru wind >= 20 km/h 14:00-17:00 (paused)
 *   Alerts: 24 past alerts over about six weeks (the two newest unread), so Alert history
 *           shows "This week", "Earlier" and a second page
 *
 * WeatherPing has no privileged roles, so this is only for development.
 * Usage: npm run seed:dev
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { AlertEventModel } = require('../src/modules/alerts/alertEvent.model');
const { authRepository } = require('../src/modules/auth/auth.repository');
const { BCRYPT_ROUNDS } = require('../src/modules/auth/auth.service');
const { locationRepository } = require('../src/modules/locations/location.repository');
const { notificationLogRepository } = require('../src/modules/mail/notificationLog.repository');
const { ruleRepository } = require('../src/modules/rules/rule.repository');
const { userRepository } = require('../src/modules/users/user.repository');
const { pastAlert } = require('./seed-helpers');

const DEV_DATABASE = 'weatherping';
const DEV_EMAIL = 'dev@weatherping.test';
const TIME_ZONE = 'Asia/Kolkata';

async function removeExistingDevUser() {
  const existing = await userRepository.findByEmail(DEV_EMAIL);
  if (!existing) return;

  await AlertEventModel.deleteMany({ userId: existing.id });
  await ruleRepository.deleteAllForUser(existing.id);
  await locationRepository.deleteAllForUser(existing.id);
  await notificationLogRepository.deleteAllForUser(existing.id);
  await authRepository.deleteAllRefreshTokens(existing.id);
  await authRepository.deleteAllResetTokens(existing.id);
  await userRepository.deleteById(existing.id);
}

async function main() {
  if (!env.DEMO_PASSWORD) {
    throw new Error('Set DEMO_PASSWORD in .env first (the dev user uses the demo-only password).');
  }

  await connectDb();
  try {
    // Never seed the test or demo database by mistake.
    if (mongoose.connection.name !== DEV_DATABASE) {
      throw new Error(`seed:dev only runs on the "${DEV_DATABASE}" database, not "${mongoose.connection.name}".`);
    }

    await removeExistingDevUser();

    const user = await userRepository.create({
      name: 'Priya',
      email: DEV_EMAIL,
      passwordHash: await bcrypt.hash(env.DEMO_PASSWORD, BCRYPT_ROUNDS),
      timeZone: TIME_ZONE,
    });

    const chennai = await locationRepository.create({
      userId: user.id, name: 'Chennai', region: 'Tamil Nadu', country: 'India', latitude: 13.0878, longitude: 80.2785,
    });
    const bengaluru = await locationRepository.create({
      userId: user.id, name: 'Bengaluru', region: 'Karnataka', country: 'India', latitude: 12.9719, longitude: 77.5937,
    });

    const rain = await ruleRepository.create({
      userId: user.id, locationId: chennai.id, condition: 'rain', threshold: 60, windowStart: '07:00', windowEnd: '09:00',
    });
    const heat = await ruleRepository.create({
      userId: user.id, locationId: chennai.id, condition: 'heat', threshold: 33, windowStart: '12:00', windowEnd: '15:00',
    });
    const aqi = await ruleRepository.create({
      userId: user.id, locationId: bengaluru.id, condition: 'aqi', threshold: 150, windowStart: '17:00', windowEnd: '21:00',
    });
    await ruleRepository.create({
      userId: user.id, locationId: bengaluru.id, condition: 'wind', threshold: 20, windowStart: '14:00', windowEnd: '17:00', status: 'paused',
    });

    // Each event is [days ago, forecast value]. A rule has at most one alert per day, as the
    // unique {ruleId, eventKey} index requires. Alerts from the last two days are unread.
    const history = [
      { rule: rain, location: chennai, peakHour: 7, events: [[1, 80], [4, 65], [8, 90], [11, 70], [15, 75], [19, 85], [24, 60], [30, 95], [37, 70]] },
      { rule: aqi, location: bengaluru, peakHour: 18, events: [[2, 168], [6, 152], [10, 175], [16, 160], [21, 190], [27, 155], [33, 170], [40, 162]] },
      { rule: heat, location: chennai, peakHour: 13, events: [[5, 35], [9, 36], [13, 34], [17, 37], [22, 35], [28, 33], [34, 38]] },
    ];
    const alerts = [];
    for (const { rule, location, peakHour, events } of history) {
      for (const [daysAgo, value] of events) {
        alerts.push(pastAlert({ user, rule, location, daysAgo, peakHour, value, read: daysAgo > 2, runId: 'seed-dev' }));
      }
    }
    await AlertEventModel.insertMany(alerts);

    console.log(`Seeded ${DEV_EMAIL} (password = DEMO_PASSWORD): 2 places, 4 rules (1 paused), ${alerts.length} past alerts.`);
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
