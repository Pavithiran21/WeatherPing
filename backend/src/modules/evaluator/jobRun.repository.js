const { JobRunModel } = require('./jobRun.model');

const jobRunRepository = {
  async start(runId, trigger, startedAt) {
    await JobRunModel.create({ runId, trigger, startedAt });
  },

  /** counts: { rulesChecked, alertsSent, duplicatesSkipped, locationsSkipped, emailFailures } */
  async finish(runId, status, counts) {
    await JobRunModel.updateOne({ runId }, { $set: { status, finishedAt: new Date(), ...counts } });
  },
};

module.exports = { jobRunRepository };
