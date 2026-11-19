/**
 * Drops the demo database and confirms it is gone (step 5 and 6 of a demo, CLAUDE.md).
 * The name is fixed to weatherping_demo whatever the env file says, so this script can never
 * drop the development or test database. It reads the cluster from .env (or ENV_FILE) and
 * works whether or not .env.demo still exists.
 *
 * Usage: npm run demo:drop   (scripts/demo-down.ps1 runs it)
 */
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { withDatabaseName } = require('../src/utils/mongoUri');

const DEMO_DATABASE = 'weatherping_demo';

async function databaseExists(name) {
  const { databases } = await mongoose.connection.db.admin().listDatabases({ nameOnly: true });
  return databases.some((database) => database.name === name);
}

async function main() {
  // A plain connection: no models are loaded, so nothing builds indexes in the demo database.
  await mongoose.connect(withDatabaseName(env.MONGODB_URI, DEMO_DATABASE), { serverSelectionTimeoutMS: 10_000 });
  try {
    if (mongoose.connection.name !== DEMO_DATABASE) {
      throw new Error(`demo:drop only drops "${DEMO_DATABASE}", not "${mongoose.connection.name}".`);
    }

    await mongoose.connection.dropDatabase();

    if (await databaseExists(DEMO_DATABASE)) {
      throw new Error(`${DEMO_DATABASE} still exists after the drop.`);
    }
    console.log(`Dropped ${DEMO_DATABASE}; confirmed it no longer exists.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
