// MongoDB reports a unique index violation as error code 11000 ("E11000 duplicate key").
function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

module.exports = { isDuplicateKeyError };
