const { Schema, model } = require('mongoose');

const locationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    // State or province, for example "Tamil Nadu".
    region: { type: String, default: null },
    country: { type: String, default: null },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { timestamps: true },
);

// "My spots" list, oldest first.
locationSchema.index({ userId: 1, createdAt: 1 });
// A user can save the same point only once.
locationSchema.index({ userId: 1, latitude: 1, longitude: 1 }, { unique: true });

const LocationModel = model('Location', locationSchema);

module.exports = { LocationModel };
