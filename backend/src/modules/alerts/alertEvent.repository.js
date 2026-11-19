const { AlertEventModel } = require('./alertEvent.model');

const alertEventRepository = {
  /**
   * Claims an event by inserting it. Throws a duplicate-key error (E11000) if this
   * rule already has an event for this eventKey, from this run or any other.
   */
  claim(event) {
    return AlertEventModel.create({ ...event, status: 'sending' });
  },

  async markSent(id) {
    await AlertEventModel.updateOne({ _id: id }, { $set: { status: 'sent', sentAt: new Date() } });
  },

  async markFailed(id) {
    await AlertEventModel.updateOne({ _id: id }, { $set: { status: 'failed' } });
  },

  /** Alert history: only events whose email was sent. filter: { locationId? }. Returns [items, totalItems]. */
  listSentForUser(userId, filter, { skip, limit, sort }) {
    const query = { userId, status: 'sent' };
    if (filter.locationId) query.locationId = filter.locationId;

    return Promise.all([
      AlertEventModel.find(query).sort(sort).skip(skip).limit(limit),
      AlertEventModel.countDocuments(query),
    ]);
  },

  countUnread(userId) {
    return AlertEventModel.countDocuments({ userId, status: 'sent', readAt: null });
  },

  async markAllRead(userId) {
    await AlertEventModel.updateMany({ userId, status: 'sent', readAt: null }, { $set: { readAt: new Date() } });
  },

  async deleteAllForUser(userId) {
    await AlertEventModel.deleteMany({ userId });
  },
};

module.exports = { alertEventRepository };
