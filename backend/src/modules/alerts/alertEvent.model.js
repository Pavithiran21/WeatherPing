const { Schema, model } = require('mongoose');
const { CONDITION_NAMES } = require('../rules/conditions');

/**
 * One alert event = one rule's window on one local date. It is inserted BEFORE the
 * email is sent; the unique index on (ruleId, eventKey) guarantees that only one
 * evaluator run can ever insert it, so only one email is sent per rule and event.
 *
 * The rule and place details are copied in, so the alert history still reads
 * correctly after the rule or place is deleted.
 */
const alertEventSchema = new Schema(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'Rule', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    // Local date of the window in the user's time zone, for example "2026-10-21".
    eventKey: { type: String, required: true },

    locationName: { type: String, required: true },
    condition: { type: String, enum: CONDITION_NAMES, required: true },
    threshold: { type: Number, required: true },
    windowStart: { type: String, required: true },
    windowEnd: { type: String, required: true },
    // The worst forecast value in the window and the hour it is expected (UTC).
    forecastValue: { type: Number, required: true },
    forecastTime: { type: Date, required: true },

    // sending -> sent, or sending -> failed. Never retried (at-most-once delivery).
    status: { type: String, enum: ['sending', 'sent', 'failed'], default: 'sending' },
    sentAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    runId: { type: String, required: true },
  },
  { timestamps: true },
);

// The duplicate guard: the database refuses a second event for the same rule and date.
alertEventSchema.index({ ruleId: 1, eventKey: 1 }, { unique: true });
// Alert history, newest first, and the unread count.
alertEventSchema.index({ userId: 1, createdAt: -1 });
alertEventSchema.index({ userId: 1, readAt: 1 });

const AlertEventModel = model('AlertEvent', alertEventSchema);

module.exports = { AlertEventModel };
