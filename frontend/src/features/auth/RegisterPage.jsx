import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowRight, IconLock, IconMail, IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { StrengthHint, StrengthMeter } from '../../components/PasswordStrength';
import { TextField } from '../../components/TextField';
import { TimeZoneSelect } from '../../components/TimeZoneSelect';
import { applyFieldErrors, errorMessage, isNetworkError } from '../../lib/apiErrors';
import { browserTimeZone } from '../../lib/timeZones';
import { useToast } from '../../toast/ToastContext';
import { registerSchema } from './authSchemas';

export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', timeZone: browserTimeZone() },
  });
  const password = useWatch({ control, name: 'password' });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await createAccount(values); // GuestOnly then opens the dashboard.
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') {
        setError('email', { message: 'That email already has an account. Log in instead.' }, { shouldFocus: true });
      } else if (isNetworkError(error)) {
        toast.error(error.message);
      } else if (!applyFieldErrors(error, setError, ['name', 'email', 'password', 'timeZone'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <>
      <h2 className="mb-1 text-[34px]">Create your account</h2>
      <p className="mb-5 text-muted">Free. Takes a minute.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField label="Name" icon={IconUser} autoComplete="name" error={errors.name?.message} {...register('name')} />
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
          autoComplete="new-password"
          error={errors.password?.message}
          hint={<StrengthHint password={password} />}
          {...register('password')}
        >
          <StrengthMeter password={password} />
        </TextField>
        <Controller
          control={control}
          name="timeZone"
          render={({ field, fieldState }) => (
            <TimeZoneSelect
              id="register-time-zone"
              label="Time zone"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              error={fieldState.error?.message}
              hint="Detected from your browser. Alert times use it."
            />
          )}
        />
        {formError && (
          <p className="form-error mb-4" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn-sun w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating your account…' : 'Create account'} <IconArrowRight aria-hidden="true" />
        </button>
      </form>

      <p className="mt-4 text-center text-[15px]">
        Have an account?{' '}
        <Link to="/login" className="link">
          Log in
        </Link>
      </p>
    </>
  );
}
