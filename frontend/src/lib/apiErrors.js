// Turning API errors (api/client.js ApiError) into what the user sees.
// Messages match UI-UX.md "Validation messages" and "Toasts".

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';
export const COULD_NOT_SAVE = "Couldn't save. Check your connection and try again.";

/**
 * A 400 with field details: show each message under its field and focus the first one.
 * Returns true when at least one field got an error.
 */
export function applyFieldErrors(error, setError, fieldNames) {
  const details = (error.details ?? []).filter((detail) => fieldNames.includes(detail.field));
  details.forEach((detail, index) => {
    setError(detail.field, { type: 'server', message: detail.message }, { shouldFocus: index === 0 });
  });
  return details.length > 0;
}

export function isNetworkError(error) {
  return error?.code === 'NETWORK_ERROR';
}

/**
 * One sentence for an error that doesn't belong to a field. Null when the session ended:
 * the app is already on Log in, which says why, so the page shows nothing more.
 */
export function errorMessage(error) {
  if (error?.code === 'SESSION_ENDED') {
    return null;
  }
  if (error?.code === 'RATE_LIMITED') {
    return TOO_MANY_ATTEMPTS;
  }
  return error?.message ?? 'Something went wrong. Please try again.';
}
