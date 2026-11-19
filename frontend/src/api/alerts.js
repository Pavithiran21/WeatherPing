import { apiRequest } from './client';

// Sent alerts (the email history). See BACKEND.md "Alerts".

export function getUnreadCount() {
  return apiRequest('/alerts/unread-count');
}

/** One page of sent alerts, newest first. locationId is optional. */
export function listAlerts({ page = 1, size = 20, locationId } = {}) {
  const params = new URLSearchParams({ page, size });
  if (locationId) {
    params.set('locationId', locationId);
  }
  return apiRequest(`/alerts?${params}`);
}

export function markAllRead() {
  return apiRequest('/alerts/mark-read', { method: 'POST' });
}
