import { zodResolver } from '@hookform/resolvers/zod';
import { IconLinkOff, IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { resetPassword } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import { StrengthHint, StrengthMeter } from '../../components/PasswordStrength';
import { TextField } from '../../components/TextField';
import { applyFieldErrors, errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { resetPasswordSchema } from './authSchemas';

/**
 * The page behind the link in the reset email (/reset-password?token=...). The link is only
 * checked when the form is sent: an expired, used or changed link then shows "This link has expired".
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { endSessionLocally } = useAuth();
  const toast = useToast();
  const [linkExpired, setLinkExpired] = useState(!token);
  const [formError, setFormError] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await resetPassword({ token, password: values.password });
      // The reset signed out every session, including one in this browser.
      endSessionLocally();
      navigate('/login', { replace: true, state: { note: 'password-reset' } });
    } catch (error) {
      const badToken = error.details?.some((detail) => detail.field === 'token');
      if (error.code === 'RESET_LINK_EXPIRED' || badToken) {
        setLinkExpired(true);
      } else if (isNetworkError(error)) {
        toast.error(error.message);
      } else if (!applyFieldErrors(error, setError, ['password'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <>
      <h2 className="mb-1 text-[34px]">Set a new password</h2>
      <p className="mb-5 text-muted">Pick a new password for your WeatherPing account.</p>

      {linkExpired ? (
        <div className="rounded-[18px] border-3 border-ink bg-coral-soft px-4 py-3.5" role="alert">
          <p className="flex items-center gap-1.5 font-display text-base">
            <IconLinkOff size={20} aria-hidden="true" /> This link has expired
          </p>
          <p className="mt-1 text-sm">
            Reset links work once and last 30 minutes.{' '}
            <Link to="/forgot-password" className="link">
              Send a new link
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="New password"
            icon={IconLock}
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            hint={<StrengthHint password={password} />}
            {...register('password')}
          >
            <StrengthMeter password={password} />
          </TextField>
          <TextField
            label="Confirm password"
            icon={IconLock}
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {formError && (
            <p className="form-error mb-4" role="alert">
              {formError}
            </p>
          )}
          <button type="submit" className="btn btn-sun w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </>
  );
}
