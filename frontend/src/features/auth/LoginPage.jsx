import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowRight, IconCircleCheck, IconClockBolt, IconLock, IconMail, IconMoodSad } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { TextField } from '../../components/TextField';
import { applyFieldErrors, errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { loginSchema } from './authSchemas';
import { DemoLoginCard } from './DemoLoginCard';

// Notes another page can leave for Log in, through the router state.
const NOTES = {
  'password-reset': 'Your password is changed. Log in with your new password.',
  'account-deleted': 'Your account and everything in it are deleted.',
};

export function LoginPage() {
  const { login, sessionEnded } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), mode: 'onTouched', defaultValues: { email: '', password: '' } });

  const note = NOTES[location.state?.note];

  async function onSubmit(values) {
    setFormError(null);
    try {
      await login(values); // GuestOnly then sends the user on.
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        setFormError("That email or password doesn't match. Try again.");
      } else if (isNetworkError(error)) {
        toast.error(error.message);
      } else if (!applyFieldErrors(error, setError, ['email', 'password'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <>
      <h2 className="mb-1 text-[34px] tab:text-[40px]">Welcome back</h2>
      <p className="mb-7 text-[17px] text-muted">Log in to check your spots and alerts.</p>

      {sessionEnded && (
        <p className="mb-5 flex items-center gap-2 rounded-[14px] border-2 border-ink bg-sun-soft px-3 py-2 text-sm" role="status">
          <IconClockBolt size={20} aria-hidden="true" /> Your session has ended. Please log in again.
        </p>
      )}
      {!sessionEnded && note && (
        <p className="mb-5 flex items-center gap-2 rounded-[14px] border-2 border-ink bg-mint-soft px-3 py-2 text-sm" role="status">
          <IconCircleCheck size={20} aria-hidden="true" /> {note}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          icon={IconMail}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          icon={IconLock}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          className="mb-0"
          {...register('password')}
        />
        {formError && (
          <p className="form-error" role="alert">
            <IconMoodSad size={20} aria-hidden="true" /> {formError}
          </p>
        )}
        {/* The link's box is 44 px tall so it is easy to tap; the margins shrink to keep the spacing. */}
        <div className="mt-1.5 mb-2.5 text-right">
          <Link to="/forgot-password" className="link inline-flex min-h-11 items-center text-base">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn btn-sun w-full py-3.5 text-xl" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'} <IconArrowRight aria-hidden="true" />
        </button>
      </form>

      {/* Shown only when the backend runs in demo mode. */}
      <DemoLoginCard />

      <p className="mt-[22px] text-center text-base">
        New here?{' '}
        <Link to="/register" className="link">
          Create a free account
        </Link>
      </p>
    </>
  );
}
