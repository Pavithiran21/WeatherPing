import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowLeft, IconMail, IconMailCheck, IconSend } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { forgotPassword } from '../../api/auth';
import { TextField } from '../../components/TextField';
import { applyFieldErrors, errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { forgotPasswordSchema } from './authSchemas';

export function ForgotPasswordPage() {
  const toast = useToast();
  const [sentTo, setSentTo] = useState(null);
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), mode: 'onTouched', defaultValues: { email: '' } });

  async function onSubmit({ email }) {
    setFormError(null);
    try {
      await forgotPassword(email);
      setSentTo(email);
    } catch (error) {
      if (isNetworkError(error)) {
        toast.error(error.message);
      } else if (!applyFieldErrors(error, setError, ['email'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  // The same message whether or not the email has an account, so accounts can't be guessed.
  if (sentTo) {
    return (
      <div className="rounded-[28px] border-3 border-ink bg-mint-soft p-6 text-center" role="status">
        <span className="mx-auto mb-2.5 grid size-16 place-items-center rounded-[20px] border-3 border-ink bg-white">
          <IconMailCheck size={32} aria-hidden="true" />
        </span>
        <h2 className="text-2xl">Check your inbox</h2>
        <p className="mt-1.5 text-[15px]">
          If an account exists for <b>{sentTo}</b>, a reset link is on its way. It works once and expires in 30 minutes.
        </p>
        <p className="mt-1.5 text-[15px]">
          <Link to="/login" className="link inline-flex min-h-11 items-center gap-1">
            <IconArrowLeft size={18} aria-hidden="true" /> Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-1 text-[34px]">Forgot password?</h2>
      <p className="mb-5 text-muted">Enter your email and we'll send you a reset link.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          icon={IconMail}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        {formError && (
          <p className="form-error mb-4" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn-sun w-full" disabled={isSubmitting}>
          <IconSend aria-hidden="true" /> {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      {/* 44 px tall so it is easy to tap; the smaller margin keeps the spacing. */}
      <p className="mt-1.5 text-center text-[15px]">
        <Link to="/login" className="link inline-flex min-h-11 items-center gap-1">
          <IconArrowLeft size={18} aria-hidden="true" /> Back to log in
        </Link>
      </p>
    </>
  );
}
