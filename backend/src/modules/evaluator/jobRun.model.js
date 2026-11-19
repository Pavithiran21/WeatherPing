const { Schema, model } = require('mongoose');

// One record per evaluator run: when it ran and what it did. No personal data.
const jobRunSchema = new Schema({
  runId: { type: String, required: true, unique: true },
  trigger: { type: String, enum: ['schedule', 'script', 'api'], required: true },
  status: { type: String, enum: ['running', 'finished', 'failed'], default: 'running' },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date, default: null },
  rulesChecked: { type: Number, default: 0 },
  alertsSent: { type: Number, default: 0 },
  duplicatesSkipped: { type: Number, default: 0 },
  locationsSkipped: { type: Number, default: 0 },
  emailFailures: { type: Number, default: 0 },
});

jobRunSchema.index({ startedAt: -1 });

const JobRunModel = model('JobRun', jobRunSchema);

module.exports = { JobRunModel };
