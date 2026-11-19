const { randomUUID } = require('node:crypto');
const { logger } = require('../../utils/logger');
const { isDuplicateKeyError } = require('../../utils/mongoErrors');
const { alertEventRepository } = require('../alerts/alertEvent.repository');
const { locationRepository } = require('../locations/location.repository');
const { sendWeatherAlertEmail } = require('../mail/mail.service');
const { CONDITIONS } = require('../rules/conditions');
const { ruleRepository } = require('../rules/rule.repository');
const { userRepository } = require('../users/user.repository');
const { WeatherApiError } = require('../weather/openMeteo.client');
const { jobRunRepository } = require('./jobRun.repository');
const { findTrigger } = require('./ruleMatcher');
const { createRunWeatherCache } = require('./runWeatherCache');
const { upcomingWindows } = require('./timeWindow');

function byId(documents) {
  return new Map(documents.map((doc) => [doc.id, doc]));
}

function uniqueIds(rules, field) {
  return [...new Set(rules.map((rule) => rule[field].toString()))];
}

function groupByLocation(rules) {
  const groups = new Map();
  for (const rule of rules) {
    const key = rule.locationId.toString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rule);
  }
  return groups;
}

/**
 * Fetches only what this place's rules need (forecast and/or air quality).
 * Returns null if the weather API failed: the place is skipped for this run,
 * so no alert is ever sent from missing or stale data.
 */
async function loadWeather(cache, location, rules, runId) {
  const sources = new Set(rules.map((rule) => CONDITIONS[rule.condition].source));
  try {
    const [forecast, airQuality] = await Promise.all([
      sources.has('forecast') ? cache.forecast(location.latitude, location.longitude) : null,
      sources.has('airQuality') ? cache.airQuality(location.latitude, location.longitude) : null,
    ]);
    return { forecast, airQuality };
  } catch (error) {
    if (error instanceof WeatherApiError) {
      logger.warn({ runId, locationId: location.id, reason: error.reason }, 'Place skipped: weather API failed');
      return null;
    }
    throw error;
  }
}

/**
 * Checks one rule's upcoming windows and sends at most one email per window.
 * The duplicate guard: the alert event is inserted BEFORE the email is sent, under a
 * unique index on (ruleId, eventKey). Only the run whose insert succeeds sends; any
 * other run (earlier, later or at the same moment) gets E11000 and skips.
 */
async function evaluateRule({ rule, user, location, weather, now, runId, counts }) {
  for (const window of upcomingWindows(rule, user.timeZone, now)) {
    const trigger = findTrigger(rule, weather, window, now);
    if (!trigger) {
      continue;
    }

    let event;
    try {
      event = await alertEventRepository.claim({
        ruleId: rule._id,
        userId: rule.userId,
        locationId: rule.locationId,
        eventKey: window.eventKey,
        locationName: location.name,
        condition: rule.condition,
        threshold: rule.threshold,
        windowStart: rule.windowStart,
        windowEnd: rule.windowEnd,
        forecastValue: trigger.value,
        forecastTime: trigger.time,
        runId,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        counts.duplicatesSkipped += 1;
        continue;
      }
      throw error;
    }

    // At-most-once: a failed send is recorded and not retried, because a retry could
    // duplicate an email the SMTP server had in fact accepted.
    const sent = await sendWeatherAlertEmail(user, event);
    if (sent) {
      await alertEventRepository.markSent(event._id);
      counts.alertsSent += 1;
    } else {
      await alertEventRepository.markFailed(event._id);
      counts.emailFailures += 1;
    }
  }
}

/**
 * One evaluator run: checks every active rule against the forecast and sends
 * deduplicated alerts. Safe to run many times and in parallel.
 * trigger: 'schedule' | 'script' | 'api'. Returns the run summary.
 */
async function runEvaluation({ trigger, now = new Date() }) {
  const runId = randomUUID();
  const startedAt = new Date();
  const counts = { rulesChecked: 0, alertsSent: 0, duplicatesSkipped: 0, locationsSkipped: 0, emailFailures: 0 };
  await jobRunRepository.start(runId, trigger, startedAt);

  try {
    const rules = await ruleRepository.findAllActive();
    const [users, locations] = await Promise.all([
      userRepository.findByIds(uniqueIds(rules, 'userId')),
      locationRepository.findByIds(uniqueIds(rules, 'locationId')),
    ]);
    const usersById = byId(users);
    const locationsById = byId(locations);
    const weatherCache = createRunWeatherCache();

    for (const [locationId, locationRules] of groupByLocation(rules)) {
      const location = locationsById.get(locationId);
      if (!location) {
        continue; // deleted while the run was starting
      }

      const weather = await loadWeather(weatherCache, location, locationRules, runId);
      if (!weather) {
        counts.locationsSkipped += 1;
        continue;
      }

      for (const rule of locationRules) {
        const user = usersById.get(rule.userId.toString());
        if (!user) {
          continue;
        }
        counts.rulesChecked += 1;
        await evaluateRule({ rule, user, location, weather, now, runId, counts });
      }
    }
  } catch (error) {
    logger.error({ runId, trigger, err: error }, 'Evaluator run failed');
    await jobRunRepository.finish(runId, 'failed', counts);
    throw error;
  }

  await jobRunRepository.finish(runId, 'finished', counts);
  // Counts and ids only: never emails, names or places.
  logger.info({ runId, trigger, durationMs: Date.now() - startedAt.getTime(), ...counts }, 'Evaluator run finished');
  return { runId, ...counts };
}

module.exports = { runEvaluation };
