import { apiRequest, setAccessToken } from './client';

/** PATCH /me: only the name and time zone can change. Returns the updated user. */
export function updateProfile({ name, timeZone }) {
  return apiRequest('/me', { method: 'PATCH', body: { name, timeZone } });
}

export async function changePassword({ currentPassword, newPassword }) {
  const result = await apiRequest('/me/password', { method: 'POST', body: { currentPassword, newPassword } });
  // Every other session is signed out; this one continues with the new token (and a new cookie).
  setAccessToken(result.accessToken);
}

export function deleteAccount(password) {
  return apiRequest('/me', { method: 'DELETE', body: { password } });
}
