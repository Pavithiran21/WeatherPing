import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/auth';
import * as demoApi from '../api/demo';
import { refreshSession, setAccessToken, setSessionEndedHandler } from '../api/client';
import { AuthContext } from './AuthContext';

/**
 * Holds the signed-in user. The access token itself stays inside api/client.js.
 * On first load the refresh cookie restores the session, so a page reload keeps you logged in.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  // Why the user ended the session on purpose ('logged-out', 'account-deleted'), or null.
  // RequireAuth uses it to send them to Log in with that note, instead of remembering the
  // page they were on. Pages don't navigate to Log in themselves: React Router renders a
  // navigation as a transition, after the "no user" render, so the guard's redirect would win.
  const [signOutReason, setSignOutReason] = useState(null);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
    // Cached server data belongs to one user. Clear it after the logged-in pages are
    // gone (this effect runs after they unmount), so nothing refetches it without a token.
    if (!user) {
      queryClient.clear();
    }
  }, [user, queryClient]);

  useEffect(() => {
    let cancelled = false;
    refreshSession().then((session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A logged-in request got 401 and the refresh failed: the token was signed with an old
  // secret, the account is gone, or the session expired. Send the user to Log in.
  useEffect(() => {
    setSessionEndedHandler(() => {
      if (!userRef.current) {
        return; // Already logged out (a request that was in flight during logout).
      }
      setAccessToken(null);
      setUser(null);
      setSessionEnded(true);
    });
  }, []);

  const startSession = useCallback((session) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setSessionEnded(false);
    setSignOutReason(null);
  }, []);

  /**
   * Forgets the session in this tab only, after the server has already ended it. reason says
   * why the user ended it on purpose ('logged-out', 'account-deleted'); see signOutReason.
   */
  const endSessionLocally = useCallback((reason = null) => {
    setAccessToken(null);
    setUser(null);
    setSignOutReason(reason);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      sessionEnded,
      signOutReason,
      login: async (credentials) => startSession(await authApi.login(credentials)),
      register: async (input) => startSession(await authApi.register(input)),
      // Demo mode only: the "Log in as <role>" buttons on Log in.
      demoLogin: async (role) => startSession(await demoApi.demoLogin(role)),
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // The session ends in this tab anyway; the cookie expires on its own.
        }
        endSessionLocally('logged-out');
      },
      updateUser: setUser,
      endSessionLocally,
    }),
    [user, isLoading, sessionEnded, signOutReason, startSession, endSessionLocally],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
