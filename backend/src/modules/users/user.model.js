const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    // IANA time zone, for example "Asia/Kolkata". Rule windows are read in this zone.
    timeZone: { type: String, required: true },
    // Demo accounts cannot change their password or be deleted.
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const UserModel = model('User', userSchema);

module.exports = { UserModel };
