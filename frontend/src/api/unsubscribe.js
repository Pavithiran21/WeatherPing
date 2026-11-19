import { apiRequest } from './client';

// The public Unsubscribe page (link from an alert email). The signed token proves which
// rule it is for, not a login, so these never try to refresh a session (auth: false).

/** Pauses the rule. Returns { ruleId, status: 'paused', summary, locationName }. */
export function unsubscribe(token) {
  return apiRequest('/unsubscribe', { method: 'POST', body: { token }, auth: false });
}

/** Turns the rule back on. Returns { ruleId, status: 'active', summary, locationName }. */
export function undoUnsubscribe(token) {
  return apiRequest('/unsubscribe/undo', { method: 'POST', body: { token }, auth: false });
}
