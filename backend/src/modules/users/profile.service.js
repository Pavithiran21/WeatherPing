const bcrypt = require('bcryptjs');
const { AppError } = require('../../utils/AppError');
const { alertEventRepository } = require('../alerts/alertEvent.repository');
const { authRepository } = require('../auth/auth.repository');
const { BCRYPT_ROUNDS, createSession } = require('../auth/auth.service');
const { locationRepository } = require('../locations/location.repository');
const { ruleRepository } = require('../rules/rule.repository');
const { notificationLogRepository } = require('../mail/notificationLog.repository');
const { userRepository } = require('./user.repository');

// The access token can outlive a deleted account by a few minutes; treat that as logged out.
function accountGone() {
  return new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
}

function ensureNotDemo(user) {
  if (user.isDemo) {
    throw new AppError(403, 'DEMO_ACCOUNT_LOCKED', 'Demo accounts cannot change their password or be deleted.');
  }
}

// A wrong password here is a form error (400), not 401: the frontend logs the user out
// on any 401, and a typo must not end their session.
async function verifyPassword(user, password, field) {
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    const message = "That password isn't right.";
    throw new AppError(400, 'WRONG_PASSWORD', message, [{ field, message }]);
  }
}

async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw accountGone();
  }
  return user;
}

/** changes: { name?, timeZone? } */
async function updateProfile(userId, changes) {
  const user = await userRepository.updateProfile(userId, changes);
  if (!user) {
    throw accountGone();
  }
  return user;
}

/** Changes the password, signs out every other session and returns a new session for this one. */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await getProfile(userId);
  ensureNotDemo(user);
  await verifyPassword(user, currentPassword, 'currentPassword');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userRepository.updatePasswordHash(userId, passwordHash);
  await authRepository.deleteAllRefreshTokens(userId);
  return createSession(userId);
}

/** Permanently removes the user and everything that belongs to them. */
async function deleteAccount(userId, password) {
  const user = await getProfile(userId);
  ensureNotDemo(user);
  await verifyPassword(user, password, 'password');

  // The user's own data first and the user record after it, so if a step fails
  // the account still exists and the user can simply try again.
  await alertEventRepository.deleteAllForUser(userId);
  await ruleRepository.deleteAllForUser(userId);
  await locationRepository.deleteAllForUser(userId);
  await notificationLogRepository.deleteAllForUser(userId);
  await authRepository.deleteAllResetTokens(userId);
  await userRepository.deleteById(userId);
  await authRepository.deleteAllRefreshTokens(userId);
}

module.exports = { getProfile, updateProfile, changePassword, deleteAccount };
