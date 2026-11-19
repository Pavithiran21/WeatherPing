import { apiRequest } from './client';

// Auth endpoints answer for people who are not logged in, so they never try to
// refresh the session on a 401 (auth: false). See BACKEND.md "Auth design".

export function register({ name, email, password, timeZone }) {
  return apiRequest('/auth/register', { method: 'POST', body: { name, email, password, timeZone }, auth: false });
}

export function login({ email, password }) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function logout() {
  return apiRequest('/auth/logout', { method: 'POST', auth: false });
}

export function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}

export function resetPassword({ token, password }) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
}
