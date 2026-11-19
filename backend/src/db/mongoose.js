const mongoose = require('mongoose');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

async function connectDb(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  // Wait for every model's indexes to be built before serving requests or running
  // jobs: the evaluator's duplicate protection depends on a unique index existing.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

  logger.info({ db: mongoose.connection.name }, 'Connected to MongoDB');
}

async function disconnectDb() {
  await mongoose.disconnect();
}

function isDbConnected() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

module.exports = { connectDb, disconnectDb, isDbConnected };
