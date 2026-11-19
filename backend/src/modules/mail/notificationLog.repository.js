const { NotificationLogModel } = require('./notificationLog.model');

const notificationLogRepository = {
  /** entry: { type, userId, status: 'sent' | 'failed', errorCode? } */
  async record(entry) {
    await NotificationLogModel.create(entry);
  },

  async deleteAllForUser(userId) {
    await NotificationLogModel.deleteMany({ userId });
  },
};

module.exports = { notificationLogRepository };
