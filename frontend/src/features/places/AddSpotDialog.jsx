import { IconAlertCircle, IconLoader2, IconMapPinCheck, IconMapPinPlus, IconSearch } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { createLocation, searchPlaces } from '../../api/locations';
import { queryKeys } from '../../api/queryKeys';
import { Dialog, DialogCloseButton } from '../../components/Dialog';
import { TextField } from '../../components/TextField';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useListboxKeys } from '../../hooks/useListboxKeys';
import { errorMessage, isNetworkError } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { placePath } from './placeQueries';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DELAY_MS = 300;
const NO_MATCH = "We couldn't find that place. Try a nearby city or coordinates.";

/** Dialog 14: search a city, area or coordinates and save it as a spot. */
export function AddSpotDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="add-spot-title" wide>
      <AddSpotForm onClose={onClose} />
    </Dialog>
  );
}

function AddSpotForm({ onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef(null);
  const [text, setText] = useState('');
  const [submitError, setSubmitError] = useState(null);

  // Search once typing pauses. Old searches are cancelled through the request signal,
  // and a search typed again comes from the cache.
  const query = useDebouncedValue(text.trim(), SEARCH_DELAY_MS);
  const canSearch = query.length >= MIN_QUERY_LENGTH;
  const search = useQuery({
    queryKey: queryKeys.placeSearch(query),
    queryFn: ({ signal }) => searchPlaces(query, signal),
    enabled: canSearch,
    staleTime: 5 * 60_000,
  });
  const results = canSearch && search.data ? search.data.results : [];
  // The search is "settled" when its results belong to what is in the field now.
  const settled = text.trim() === query && !search.isFetching;

  const add = useMutation({
    mutationFn: createLocation,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations });
      toast.success(`${created.name} added to your places`, { icon: IconMapPinCheck, tone: 'sky' });
      navigate(placePath(created.id));
      onClose();
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        toast.error(error.message);
      } else {
        // 409 LOCATION_EXISTS: "That place is already in your spots."
        setSubmitError(errorMessage(error));
        inputRef.current?.focus();
      }
    },
  });

  const { activeIndex, setActiveIndex, onKeyDown } = useListboxKeys({
    optionCount: results.length,
    isOpen: results.length > 0,
    onPick: (index) => addPlace(results[index]),
    onClose, // Esc closes the dialog (the list is always shown, there is nothing smaller to close).
  });
  // The first result is highlighted until the user moves (as in the design), so
  // "Add spot" always knows which place to add.
  const highlighted = results.length > 0 ? Math.min(Math.max(activeIndex, 0), results.length - 1) : -1;

  function addPlace(place) {
    if (!add.isPending) {
      add.mutate(place);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    if (text.trim().length < MIN_QUERY_LENGTH) {
      setSubmitError('Type at least 2 characters.');
      inputRef.current?.focus();
      return;
    }
    if (highlighted >= 0) {
      addPlace(results[highlighted]);
    }
  }

  const optionId = (index) => `add-spot-option-${index}`;
  const searchMessage = settled && canSearch ? searchMessageFor(search, results) : null;

  return (
    <>
      <div className="mb-3 flex items-center">
        <h3 id="add-spot-title" className="flex-1 text-2xl">
          Add a spot
        </h3>
        <DialogCloseButton onClose={onClose} />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          ref={inputRef}
          label="City, area or coordinates"
          icon={IconSearch}
          className="mb-1.5"
          data-autofocus
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls="add-spot-results"
          aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setSubmitError(null);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          error={submitError}
          trailing={
            search.isFetching ? (
              <IconLoader2 size={20} className="motion-safe:animate-spin" aria-label="Searching" role="img" />
            ) : null
          }
          hint={
            <>
              Tip: paste coordinates like <b>13.08, 80.27</b> for an exact spot.
            </>
          }
        >
          {/* Always in the page, so aria-controls points at a real element. */}
          <ul id="add-spot-results" role="listbox" aria-label="Places found" className={results.length > 0 ? 'menu' : 'hidden'}>
            {results.map((place, index) => (
              <li
                key={`${place.latitude},${place.longitude}`}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlighted}
                data-active={index === highlighted}
                // Keep focus in the field, so the keyboard keeps working after a click.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setActiveIndex(index)}
              >
                <span className={index === highlighted ? 'font-extrabold' : undefined}>{place.name}</span>
                <span className="text-muted">{placeArea(place)}</span>
              </li>
            ))}
          </ul>
        </TextField>

        <p className="field-error mb-3.5 min-h-5" role="status">
          {searchMessage && (
            <>
              <IconAlertCircle size={18} aria-hidden="true" /> {searchMessage}
            </>
          )}
        </p>

        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" className="btn btn-white" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sun" disabled={add.isPending || (canSearch && !settled)}>
            <IconMapPinPlus size={20} aria-hidden="true" /> {add.isPending ? 'Adding…' : 'Add spot'}
          </button>
        </div>
      </form>
    </>
  );
}

/** "Tamil Nadu, India", or "Exact spot" for typed coordinates (they have no region). */
function placeArea(place) {
  return [place.region, place.country].filter(Boolean).join(', ') || 'Exact spot';
}

/** The line under the field once a search has finished: no match, or why it failed. */
function searchMessageFor(search, results) {
  if (search.isError) {
    const error = search.error;
    // A 400 says what was wrong with the text (for example characters a place name can't have).
    const fieldMessage = error.details?.find((detail) => detail.field === 'q')?.message;
    return fieldMessage ?? errorMessage(error);
  }
  if (search.isSuccess && results.length === 0) {
    return NO_MATCH;
  }
  return null;
}
