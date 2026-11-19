const { Schema, model } = require('mongoose');
const { CONDITION_NAMES } = require('./conditions');

const ruleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    condition: { type: String, enum: CONDITION_NAMES, required: true },
    threshold: { type: Number, required: true },
    // "HH:mm" in the user's time zone; the window never crosses midnight (end > start).
    windowStart: { type: String, required: true },
    windowEnd: { type: String, required: true },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
  },
  { timestamps: true },
);

// A user's rules, optionally for one place.
ruleSchema.index({ userId: 1, locationId: 1, createdAt: 1 });
// The evaluator loads all active rules, grouped by place.
ruleSchema.index({ status: 1, locationId: 1 });

const RuleModel = model('Rule', ruleSchema);

module.exports = { RuleModel };
