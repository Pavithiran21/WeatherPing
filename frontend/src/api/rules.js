import { apiRequest } from './client';

// Alert rules. See BACKEND.md "Rules".

/** Every rule of the user, oldest first. The pages filter them by place. */
export function listRules() {
  return apiRequest('/rules?size=100&sort=createdAt');
}

export function createRule({ locationId, condition, threshold, windowStart, windowEnd }) {
  return apiRequest('/rules', { method: 'POST', body: { locationId, condition, threshold, windowStart, windowEnd } });
}

/** Sends only the fields that change; the backend checks the merged rule again. */
export function updateRule(ruleId, changes) {
  return apiRequest(`/rules/${ruleId}`, { method: 'PATCH', body: changes });
}

export function pauseRule(ruleId) {
  return apiRequest(`/rules/${ruleId}/pause`, { method: 'POST' });
}

export function resumeRule(ruleId) {
  return apiRequest(`/rules/${ruleId}/resume`, { method: 'POST' });
}

/** Deletes the rule; its past alerts stay in the history. */
export function deleteRule(ruleId) {
  return apiRequest(`/rules/${ruleId}`, { method: 'DELETE' });
}
