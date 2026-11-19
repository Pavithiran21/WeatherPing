import { Navigate, Outlet, useLocation } from 'react-router';
import { SplashScreen } from '../components/SplashScreen';
import { useAuth } from './AuthContext';

/**
 * Pages for logged-in users, and the one place that sends a signed-out user to Log in.
 * A guest, or a user whose session ended by itself, comes back here after logging in.
 * A user who logged out or deleted their account starts fresh, with Log in's note for it.
 */
export function RequireAuth() {
  const { user, isLoading, signOutReason } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <SplashScreen />;
  }
  if (!user) {
    const state = signOutReason ? { note: signOutReason } : { from: location };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/** Log in and Register. A logged-in user goes to the page they wanted, or home. */
export function GuestOnly() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <SplashScreen />;
  }
  if (user) {
    const from = location.state?.from;
    return <Navigate to={from ? from.pathname + from.search : '/'} replace />;
  }
  return <Outlet />;
}
