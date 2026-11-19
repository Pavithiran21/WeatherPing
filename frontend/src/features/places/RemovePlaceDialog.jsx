import { IconMapPinOff, IconTrash } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { removeLocation } from '../../api/locations';
import { queryKeys } from '../../api/queryKeys';
import { Dialog } from '../../components/Dialog';
import { errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';

/** Dialog 15. Says how many rules go with the place; Cancel has focus first, as in every delete dialog. */
export function RemovePlaceDialog({ open, onClose, place, ruleCount }) {
  return (
    <Dialog open={open} onClose={onClose} role="alertdialog" labelledBy="remove-place-title" describedBy="remove-place-text">
      <RemovePlaceForm place={place} ruleCount={ruleCount} onClose={onClose} />
    </Dialog>
  );
}

function RemovePlaceForm({ place, ruleCount, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState(null);

  function afterRemoved() {
    // Take the place out of the cached lists now, so the dashboard never shows it again
    // while the lists are refetched. Its rules were deleted with it on the server.
    queryClient.removeQueries({ queryKey: queryKeys.forecast(place.id) });
    queryClient.setQueryData(queryKeys.locations, (page) => page && withoutItems(page, (item) => item.id === place.id));
    queryClient.setQueryData(queryKeys.rules, (page) => page && withoutItems(page, (rule) => rule.locationId === place.id));
    queryClient.invalidateQueries({ queryKey: queryKeys.locations });
    queryClient.invalidateQueries({ queryKey: queryKeys.rules });

    toast.success(`${place.name} removed`, { icon: IconMapPinOff, tone: 'sun' });
    navigate('/', { replace: true }); // Shows the first remaining place.
    onClose();
  }

  const remove = useMutation({
    mutationFn: () => removeLocation(place.id),
    onSuccess: afterRemoved,
    onError: (error) => {
      if (error.status === 404) {
        afterRemoved(); // Already gone (removed in another tab): the result is the same.
      } else if (isNetworkError(error)) {
        toast.error(error.message);
      } else {
        setFormError(errorMessage(error));
      }
    },
  });

  return (
    <>
      <span className="mb-3 grid size-[58px] place-items-center rounded-[18px] border-3 border-ink bg-coral-soft">
        <IconMapPinOff size={30} aria-hidden="true" />
      </span>
      <h3 id="remove-place-title" className="mb-1.5 text-2xl">
        Remove {place.name}?
      </h3>
      <p id="remove-place-text" className="mb-[18px] text-[15px] leading-normal">
        {ruleCount === 0 ? (
          'It has no rules yet. '
        ) : (
          <>
            Its{' '}
            <b>
              {ruleCount} {ruleCount === 1 ? 'rule' : 'rules'}
            </b>{' '}
            {ruleCount === 1 ? 'is' : 'are'} deleted too, so you won't get alerts for this place.{' '}
          </>
        )}
        Past alerts stay in your history.
      </p>
      {formError && (
        <p className="form-error mb-4" role="alert">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2.5">
        <button type="button" data-autofocus className="btn btn-white" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-coral" disabled={remove.isPending} onClick={() => remove.mutate()}>
          <IconTrash size={20} aria-hidden="true" /> {remove.isPending ? 'Removing…' : 'Remove place'}
        </button>
      </div>
    </>
  );
}

/** A list page without the matching items: { items, totalItems, ... }. */
function withoutItems(page, isRemoved) {
  const items = page.items.filter((item) => !isRemoved(item));
  return { ...page, items, totalItems: page.totalItems - (page.items.length - items.length) };
}
