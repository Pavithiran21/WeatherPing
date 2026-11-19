const { PasswordResetTokenModel } = require('./passwordResetToken.model');
const { RefreshTokenModel } = require('./refreshToken.model');

const authRepository = {
  async saveRefreshToken(userId, tokenHash, expiresAt) {
    await RefreshTokenModel.create({ userId, tokenHash, expiresAt });
  },

  /**
   * Reads and deletes a refresh token in one atomic step. If two requests use the same
   * token at the same time, only one gets it back, so a token can be rotated only once.
   */
  consumeRefreshToken(tokenHash) {
    return RefreshTokenModel.findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } });
  },

  async deleteRefreshToken(tokenHash) {
    await RefreshTokenModel.deleteOne({ tokenHash });
  },

  async deleteAllRefreshTokens(userId) {
    await RefreshTokenModel.deleteMany({ userId });
  },

  async saveResetToken(userId, tokenHash, expiresAt) {
    await PasswordResetTokenModel.create({ userId, tokenHash, expiresAt });
  },

  /** Marks a reset token used in one atomic step; returns null if it is unknown, used or expired. */
  consumeResetToken(tokenHash) {
    return PasswordResetTokenModel.findOneAndUpdate(
      { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
    );
  },

  async deleteAllResetTokens(userId) {
    await PasswordResetTokenModel.deleteMany({ userId });
  },
};

module.exports = { authRepository };
