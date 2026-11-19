const { Schema, model } = require('mongoose');

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // SHA-256 of the token; the token itself is only in the emailed link.
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    // Set when the link is used, so it works only once.
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index: MongoDB deletes each token by itself once expiresAt has passed.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetTokenModel = model('PasswordResetToken', passwordResetTokenSchema);

module.exports = { PasswordResetTokenModel };
