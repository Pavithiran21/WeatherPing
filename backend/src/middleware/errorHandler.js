const { ZodError } = require('zod');
const { AppError } = require('../utils/AppError');
const { isDuplicateKeyError } = require('../utils/mongoErrors');

// The shared error format used by every backend in the portfolio.
function errorBody(req, code, message, details = []) {
  return { error: { code, message, details, requestId: String(req.id) } };
}

function notFoundHandler(req, res) {
  res.status(404).json(errorBody(req, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}.`));
}

// Express knows this is an error handler because it takes four arguments.
function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json(errorBody(req, error.code, error.message, error.details));
    return;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json(errorBody(req, 'VALIDATION_FAILED', 'Some fields are not valid.', details));
    return;
  }

  // express.json() marks its own errors with a "type" field.
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json(errorBody(req, 'INVALID_JSON', 'The request body is not valid JSON.'));
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json(errorBody(req, 'PAYLOAD_TOO_LARGE', 'The request body is too large.'));
    return;
  }

  // A duplicate-key message contains the duplicated value (for example an email),
  // so it is logged without the message.
  if (isDuplicateKeyError(error)) {
    req.log.warn({ code: 11000 }, 'Unexpected duplicate key');
    res.status(409).json(errorBody(req, 'CONFLICT', 'That item already exists.'));
    return;
  }

  req.log.error({ err: error }, 'Unhandled error');
  res.status(500).json(errorBody(req, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'));
}

module.exports = { notFoundHandler, errorHandler };
