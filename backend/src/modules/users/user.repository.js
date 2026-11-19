const { UserModel } = require('./user.model');

const userRepository = {
  /** data: { email, passwordHash, name, timeZone } */
  create(data) {
    return UserModel.create(data);
  },

  findById(id) {
    return UserModel.findById(id);
  },

  findByIds(ids) {
    return UserModel.find({ _id: { $in: ids } });
  },

  findByEmail(email) {
    return UserModel.findOne({ email });
  },

  /** changes: { name?, timeZone? } */
  updateProfile(id, changes) {
    return UserModel.findByIdAndUpdate(id, { $set: changes }, { returnDocument: 'after', runValidators: true });
  },

  async updatePasswordHash(id, passwordHash) {
    await UserModel.updateOne({ _id: id }, { $set: { passwordHash } });
  },

  async deleteById(id) {
    await UserModel.deleteOne({ _id: id });
  },
};

module.exports = { userRepository };
