import { apiRequest } from './client';

// Demo-mode endpoints (see BACKEND.md "Demo mode"). They exist only when the backend runs with
// DEMO_MODE=true; otherwise they answer 404 and the Log in page shows no demo buttons.

export function getDemoAccounts() {
  return apiRequest('/demo', { auth: false });
}

export function demoLogin(role) {
  return apiRequest('/demo/login', { method: 'POST', body: { role }, auth: false });
}
