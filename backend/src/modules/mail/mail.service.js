const { env } = require('../../config/env');
const { logger } = require('../../utils/logger');
const { createUnsubscribeToken } = require('../unsubscribe/unsubscribeToken');
const { sendEmail } = require('./mailer');
const { notificationLogRepository } = require('./notificationLog.repository');
const { passwordResetEmail, weatherAlertEmail } = require('./templates');

/**
 * Sends one email and records the outcome in the notification log.
 * Returns true or false instead of throwing, so callers decide what a failure means.
 * Logs carry the user id and error code only, never the address or content.
 */
async function sendAndRecord(type, userId, to, content) {
  try {
    await sendEmail({ to, ...content });
    await notificationLogRepository.record({ type, userId, status: 'sent' });
    return true;
  } catch (error) {
    const errorCode = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
    logger.error({ type, userId, errorCode }, 'Email could not be sent');
    await notificationLogRepository.record({ type, userId, status: 'failed', errorCode });
    return false;
  }
}

/** user: { id, email, name } */
function sendPasswordResetEmail(user, resetLink) {
  return sendAndRecord('password_reset', user.id, user.email, passwordResetEmail(user.name, resetLink));
}

/** user: { id, email, name, timeZone }; alert: the claimed alert event. Returns true if sent. */
function sendWeatherAlertEmail(user, alert) {
  const content = weatherAlertEmail({
    name: user.name,
    timeZone: user.timeZone,
    alert,
    appLink: env.FRONTEND_URL,
    unsubscribeLink: `${env.FRONTEND_URL}/unsubscribe?token=${createUnsubscribeToken(alert.ruleId.toString())}`,
  });
  return sendAndRecord('weather_alert', user.id, user.email, content);
}

module.exports = { sendPasswordResetEmail, sendWeatherAlertEmail };
