const { RuleModel } = require('./rule.model');

// Every user-facing read and write includes userId, so a user only ever reaches their own rules.
const ruleRepository = {
  /** data: { userId, locationId, condition, threshold, windowStart, windowEnd } */
  create(data) {
    return RuleModel.create(data);
  },

  findOwned(userId, id) {
    return RuleModel.findOne({ _id: id, userId });
  },

  // Used by the evaluator, which works across all users.
  findAllActive() {
    return RuleModel.find({ status: 'active' });
  },

  // Used by the unsubscribe link, where the signed token (not a login) proves the rule is the reader's.
  setStatusById(id, status) {
    return RuleModel.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after' });
  },

  /** filter: { locationId?, status? }. Returns [items, totalItems] for one page. */
  listOwned(userId, filter, { skip, limit, sort }) {
    const query = { userId };
    if (filter.locationId) query.locationId = filter.locationId;
    if (filter.status) query.status = filter.status;

    return Promise.all([
      RuleModel.find(query).sort(sort).skip(skip).limit(limit),
      RuleModel.countDocuments(query),
    ]);
  },

  updateOwned(userId, id, changes) {
    return RuleModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: changes },
      { returnDocument: 'after', runValidators: true },
    );
  },

  /** Returns true if a rule was deleted. */
  async deleteOwned(userId, id) {
    const result = await RuleModel.deleteOne({ _id: id, userId });
    return result.deletedCount === 1;
  },

  async deleteAllForLocation(userId, locationId) {
    await RuleModel.deleteMany({ userId, locationId });
  },

  async deleteAllForUser(userId) {
    await RuleModel.deleteMany({ userId });
  },
};

module.exports = { ruleRepository };
