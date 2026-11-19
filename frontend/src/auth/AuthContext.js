import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/** { user, isLoading, sessionEnded, signOutReason, login, register, demoLogin, logout, updateUser, endSessionLocally } */
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return auth;
}
