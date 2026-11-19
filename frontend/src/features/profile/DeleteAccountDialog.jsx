import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertTriangle, IconLock, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { deleteAccount } from '../../api/profile';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../../components/Dialog';
import { TextField } from '../../components/TextField';
import { errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { currentPasswordField } from '../auth/authSchemas';

const deleteAccountSchema = z.object({ password: currentPasswordField });

/** Dialog 17. Asks for the password; Cancel has focus first, as in every delete dialog. */
export function DeleteAccountDialog({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      labelledBy="delete-account-title"
      describedBy="delete-account-text"
    >
      <DeleteAccountForm onClose={onClose} />
    </Dialog>
  );
}

function DeleteAccountForm({ onClose }) {
  const { endSessionLocally } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(deleteAccountSchema), mode: 'onTouched', defaultValues: { password: '' } });

  async function onSubmit({ password }) {
    setFormError(null);
    try {
      await deleteAccount(password);
      // RequireAuth then opens Log in with the "account deleted" note.
      endSessionLocally('account-deleted');
    } catch (error) {
      if (error.code === 'WRONG_PASSWORD') {
        setError('password', { message: "That password isn't right." }, { shouldFocus: true });
      } else if (isNetworkError(error)) {
        toast.error(error.message);
      } else {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <span className="mb-3 grid size-[58px] place-items-center rounded-[18px] border-3 border-ink bg-coral-soft">
        <IconAlertTriangle size={30} aria-hidden="true" />
      </span>
      <h3 id="delete-account-title" className="mb-1.5 text-2xl">
        Delete your account?
      </h3>
      <p id="delete-account-text" className="mb-[18px] text-[15px] leading-normal">
        This removes your places, rules and alert history <b>for good</b>. Enter your password to confirm.
      </p>
      <TextField
        label="Password"
        icon={IconLock}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {formError && (
        <p className="form-error mb-4" role="alert">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2.5">
        <button type="button" data-autofocus className="btn btn-white" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-coral" disabled={isSubmitting}>
          <IconTrash aria-hidden="true" /> {isSubmitting ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </form>
  );
}
