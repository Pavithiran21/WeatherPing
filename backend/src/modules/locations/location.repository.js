const { LocationModel } = require('./location.model');

// Every read and write includes userId, so a user can only ever reach their own places.
const locationRepository = {
  /** data: { userId, name, region, country, latitude, longitude } */
  create(data) {
    return LocationModel.create(data);
  },

  findOwned(userId, id) {
    return LocationModel.findOne({ _id: id, userId });
  },

  // Used by the evaluator and the unsubscribe link, which are not tied to a login.
  findById(id) {
    return LocationModel.findById(id);
  },

  findByIds(ids) {
    return LocationModel.find({ _id: { $in: ids } });
  },

  /** Returns [items, totalItems] for one page. */
  listOwned(userId, { skip, limit, sort }) {
    return Promise.all([
      LocationModel.find({ userId }).sort(sort).skip(skip).limit(limit),
      LocationModel.countDocuments({ userId }),
    ]);
  },

  /** Returns true if a place was deleted. */
  async deleteOwned(userId, id) {
    const result = await LocationModel.deleteOne({ _id: id, userId });
    return result.deletedCount === 1;
  },

  async deleteAllForUser(userId) {
    await LocationModel.deleteMany({ userId });
  },
};

module.exports = { locationRepository };
