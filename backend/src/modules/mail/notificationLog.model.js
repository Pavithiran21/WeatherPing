const { Schema, model } = require('mongoose');

const NOTIFICATION_TYPES = ['password_reset', 'weather_alert'];

// One row per email the app tried to send. It stores no address or content.
const notificationLogSchema = new Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    // SMTP error code such as "EAUTH" when sending failed.
    errorCode: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationLogSchema.index({ userId: 1, createdAt: -1 });

const NotificationLogModel = model('NotificationLog', notificationLogSchema);

module.exports = { NotificationLogModel, NOTIFICATION_TYPES };
