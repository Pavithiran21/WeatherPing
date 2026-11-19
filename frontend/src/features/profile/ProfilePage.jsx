import { zodResolver } from '@hookform/resolvers/zod';
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconInfoCircle,
  IconKey,
  IconLock,
  IconLogout,
  IconMail,
  IconUser,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { updateProfile } from '../../api/profile';
import { useAuth } from '../../auth/AuthContext';
import { TextField } from '../../components/TextField';
import { TimeZoneSelect } from '../../components/TimeZoneSelect';
import { applyFieldErrors, COULD_NOT_SAVE, errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { nameField, timeZoneField } from '../auth/authSchemas';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const profileSchema = z.object({ name: nameField, timeZone: timeZoneField });

/** Screen 8: name, read-only email, time zone, change password, log out and delete account. */
export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const [openDialog, setOpenDialog] = useState(null); // 'password' | 'delete' | null

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: { name: user.name, timeZone: user.timeZone },
  });

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      updateUser(updated);
      reset({ name: updated.name, timeZone: updated.timeZone });
      toast.success('Profile saved');
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        toast.error(COULD_NOT_SAVE);
      } else if (!applyFieldErrors(error, setError, ['name', 'timeZone'])) {
        toast.error(errorMessage(error));
      }
    },
  });

  return (
    <section className="box max-w-[760px] p-5 tab:p-[26px]" aria-labelledby="profile-title">
      <div className="mb-[22px] flex items-center gap-4">
        <span className="grid size-[70px] shrink-0 place-items-center rounded-[22px] border-3 border-ink bg-grape font-display text-[30px] font-bold text-white shadow-pop-sm">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <h2 id="profile-title" className="text-[28px]">
            Profile
          </h2>
          <p className="text-muted">Member since {DateTime.fromISO(user.createdAt).toFormat('LLL yyyy')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <div className="grid gap-x-4 desk:grid-cols-2">
          <TextField label="Name" icon={IconUser} autoComplete="name" error={errors.name?.message} {...register('name')} />
          <TextField
            label="Email"
            icon={IconMail}
            value={user.email}
            readOnly
            hint={
              <span className="inline-flex items-center gap-1">
                <IconLock size={14} aria-hidden="true" /> Your sign-in email can't be changed.
              </span>
            }
          />
        </div>
        <Controller
          control={control}
          name="timeZone"
          render={({ field, fieldState }) => (
            <TimeZoneSelect
              id="profile-time-zone"
              label="Time zone"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              error={fieldState.error?.message}
              hint={
                <span className="inline-flex gap-1">
                  <IconInfoCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Your alert windows (like 7–9 am) and email times use this time zone. Each saved place still uses its
                  own local forecast.
                </span>
              }
            />
          )}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-sun" disabled={save.isPending}>
            <IconDeviceFloppy aria-hidden="true" /> {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-white" disabled={user.isDemo} onClick={() => setOpenDialog('password')}>
            <IconKey aria-hidden="true" /> Change password
          </button>
          {/* Once the session has ended, RequireAuth opens Log in. */}
          <button type="button" className="btn btn-white" onClick={logout}>
            <IconLogout aria-hidden="true" /> Log out
          </button>
        </div>
      </form>

      {user.isDemo && (
        <p className="hint">This is a demo account: its password can't be changed and it can't be deleted.</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[20px] border-3 border-dashed border-coral-ink p-4">
        <IconAlertTriangle size={28} className="text-coral-ink" aria-hidden="true" />
        <div className="min-w-[180px] flex-1">
          <p className="font-display text-[17px]">Delete account</p>
          <p className="text-sm">Removes your places, rules and alert history for good.</p>
        </div>
        <button type="button" className="btn btn-coral btn-sm" disabled={user.isDemo} onClick={() => setOpenDialog('delete')}>
          Delete account
        </button>
      </div>

      <ChangePasswordDialog open={openDialog === 'password'} onClose={() => setOpenDialog(null)} />
      <DeleteAccountDialog open={openDialog === 'delete'} onClose={() => setOpenDialog(null)} />
    </section>
  );
}
