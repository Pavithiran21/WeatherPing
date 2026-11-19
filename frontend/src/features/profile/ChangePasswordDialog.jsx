import { zodResolver } from '@hookform/resolvers/zod';
import { IconDevices, IconKey, IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { changePassword } from '../../api/profile';
import { Dialog, DialogCloseButton } from '../../components/Dialog';
import { StrengthHint, StrengthMeter } from '../../components/PasswordStrength';
import { TextField } from '../../components/TextField';
import { applyFieldErrors, COULD_NOT_SAVE, errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { currentPasswordField, newPasswordField } from '../auth/authSchemas';

const changePasswordSchema = z
  .object({
    currentPassword: currentPasswordField,
    newPassword: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  });

/** Dialog 16. The backend signs out the user's other devices and keeps this one logged in. */
export function ChangePasswordDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="change-password-title" wide>
      <ChangePasswordForm onClose={onClose} />
    </Dialog>
  );
}

function ChangePasswordForm({ onClose }) {
  const toast = useToast();
  const [formError, setFormError] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await changePassword(values);
      toast.success('Password changed. Your other devices were signed out.');
      onClose();
    } catch (error) {
      if (error.code === 'WRONG_PASSWORD') {
        setError('currentPassword', { message: "That password isn't right." }, { shouldFocus: true });
      } else if (isNetworkError(error)) {
        toast.error(COULD_NOT_SAVE);
      } else if (!applyFieldErrors(error, setError, ['currentPassword', 'newPassword'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-3 flex items-center">
        <h3 id="change-password-title" className="flex-1 text-2xl">
          Change password
        </h3>
        <DialogCloseButton onClose={onClose} />
      </div>
      <TextField
        label="Current password"
        icon={IconLock}
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        data-autofocus
        {...register('currentPassword')}
      />
      <TextField
        label="New password"
        icon={IconLock}
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        hint={<StrengthHint password={newPassword} />}
        {...register('newPassword')}
      >
        <StrengthMeter password={newPassword} />
      </TextField>
      <TextField
        label="Confirm new password"
        icon={IconLock}
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <p className="hint mb-4 flex items-center gap-1.5">
        <IconDevices size={16} aria-hidden="true" /> Your other devices will be signed out.
      </p>
      {formError && (
        <p className="form-error mb-4" role="alert">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-2.5">
        <button type="button" className="btn btn-white" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-sun" disabled={isSubmitting}>
          <IconKey aria-hidden="true" /> {isSubmitting ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
