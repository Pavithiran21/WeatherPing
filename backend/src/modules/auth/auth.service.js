const bcrypt = require('bcryptjs');
const { env } = require('../../config/env');
const { AppError } = require('../../utils/AppError');
const { isDuplicateKeyError } = require('../../utils/mongoErrors');
const { sendPasswordResetEmail } = require('../mail/mail.service');
const { userRepository } = require('../users/user.repository');
const { authRepository } = require('./auth.repository');
const {
  createOpaqueToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  RESET_TOKEN_TTL_MS,
  signAccessToken,
} = require('./tokens');

const BCRYPT_ROUNDS = 12;

// Compared against when the email is unknown, so a failed login takes the same
// time whether or not the account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('no-such-user-dummy-password', BCRYPT_ROUNDS);

function sessionExpired() {
  return new AppError(401, 'SESSION_EXPIRED', 'Your session has ended. Please log in again.');
}

/** Issues a new access token and a new refresh token (stored hashed). Returns { accessToken, refreshToken }. */
async function createSession(userId) {
  const { token, tokenHash } = createOpaqueToken();
  await authRepository.saveRefreshToken(userId, tokenHash, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
  return { accessToken: signAccessToken(userId), refreshToken: token };
}

/** Returns { user, session }. */
async function register({ name, email, password, timeZone }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await userRepository.create({ name, email, passwordHash, timeZone });
  } catch (error) {
    // The unique index on email is the real check, so two sign-ups racing for one email are safe.
    if (isDuplicateKeyError(error)) {
      const message = 'That email already has an account. Log in instead.';
      throw new AppError(409, 'EMAIL_TAKEN', message, [{ field: 'email', message }]);
    }
    throw error;
  }

  return { user, session: await createSession(user.id) };
}

/** Returns { user, session }. */
async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', "That email or password doesn't match. Try again.");
  }
  return { user, session: await createSession(user.id) };
}

/** Rotation: the old refresh token is deleted as it is read, and a new pair is issued. Returns { user, session }. */
async function refresh(refreshToken) {
  if (!refreshToken) {
    throw sessionExpired();
  }

  const stored = await authRepository.consumeRefreshToken(hashToken(refreshToken));
  if (!stored) {
    throw sessionExpired();
  }

  const user = await userRepository.findById(stored.userId);
  if (!user) {
    throw sessionExpired();
  }
  return { user, session: await createSession(user.id) };
}

async function logout(refreshToken) {
  if (refreshToken) {
    await authRepository.deleteRefreshToken(hashToken(refreshToken));
  }
}

/**
 * Emails a single-use reset link if the account exists. The caller does not wait
 * for this, so the response never reveals whether the email has an account.
 * Demo accounts get no link: their password must not change (so no reset token
 * ever exists for them, and the reply is still the same).
 */
async function forgotPassword(email) {
  const user = await userRepository.findByEmail(email);
  if (!user || user.isDemo) {
    return;
  }

  // Only the newest link works.
  await authRepository.deleteAllResetTokens(user.id);
  const { token, tokenHash } = createOpaqueToken();
  await authRepository.saveResetToken(user.id, tokenHash, new Date(Date.now() + RESET_TOKEN_TTL_MS));

  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user, resetLink);
}

async function resetPassword(token, newPassword) {
  const stored = await authRepository.consumeResetToken(hashToken(token));
  if (!stored) {
    throw new AppError(400, 'RESET_LINK_EXPIRED', 'This link has expired. Ask for a new one.');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userRepository.updatePasswordHash(stored.userId, passwordHash);

  // Sign out every session: whoever knew the old password loses access.
  await authRepository.deleteAllRefreshTokens(stored.userId);
}

module.exports = {
  BCRYPT_ROUNDS,
  createSession,
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
