import { Dialog, DialogCloseButton } from '../../components/Dialog';
import { SpotList } from './SpotList';

/** Phone only: the sidebar's spot list as a sheet, opened from the place chip. */
export function PlaceSheet({ open, onClose, onAddSpot }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="place-sheet-title">
      <div className="mb-1 flex items-center">
        <h3 id="place-sheet-title" className="flex-1 text-2xl">
          Change place
        </h3>
        <DialogCloseButton onClose={onClose} />
      </div>
      <SpotList
        headingId="place-sheet-spots"
        onPicked={onClose}
        onAddSpot={() => {
          onClose();
          onAddSpot();
        }}
      />
    </Dialog>
  );
}
