// mongodb+srv://user:pass@host/weatherping?retryWrites=true
//   -> group 1: "mongodb+srv://user:pass@host", group 2: "?retryWrites=true"
const URI_PATTERN = /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/;

/**
 * The same connection string with another database name, options kept. Used to point
 * tests at weatherping_test and demos at weatherping_demo on the same Atlas cluster.
 */
function withDatabaseName(uri, databaseName) {
  const match = URI_PATTERN.exec(uri);
  if (!match) {
    throw new Error('MONGODB_URI is not a mongodb:// or mongodb+srv:// connection string.');
  }
  return `${match[1]}/${databaseName}${match[2] ?? ''}`;
}

module.exports = { withDatabaseName };
