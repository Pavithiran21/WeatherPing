/**
 * An expected error with an HTTP status and a stable code for the client,
 * for example new AppError(409, 'EMAIL_TAKEN', 'That email already has an account.').
 * The central error handler turns it into the shared error format.
 * details is a list of { field, message } for form errors.
 */
class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Also used when the resource belongs to another user, so we never reveal that it exists.
function notFound(what) {
  return new AppError(404, 'NOT_FOUND', `${what} not found.`);
}

module.exports = { AppError, notFound };
