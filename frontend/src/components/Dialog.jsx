import { IconX } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';

/**
 * A modal built on the native <dialog> element: showModal() makes the rest of the page
 * inert (focus can't leave the dialog) and Esc asks to close it. When the dialog closes,
 * focus goes back to the button that opened it (UI-UX.md "Keyboard").
 *
 * To choose what gets focus first (Cancel in a delete dialog, the search field in
 * Add a spot), put a data-autofocus attribute on that element. Otherwise the browser
 * focuses the first focusable element.
 */
export function Dialog({ open, onClose, role = 'dialog', labelledBy, describedBy, wide = false, large = false, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) {
      return undefined;
    }
    const opener = document.activeElement;
    // showModal() focuses the element with the autofocus attribute. Marking ours before
    // opening (instead of moving focus afterwards) means no field gets focused and left
    // first, which React Hook Form would count as "touched" and show an error for.
    dialog.querySelector('[data-autofocus]')?.setAttribute('autofocus', '');
    dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus?.();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={large ? 'dialog dialog-large' : wide ? 'dialog dialog-wide' : 'dialog'}
      // Esc: let React state close it, so the open prop and the element never disagree.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}

/**
 * The X at the top of a dialog. Pressing it doesn't move focus (mousedown default is
 * prevented; the click still fires). Otherwise the field being left would validate on blur,
 * its error message would push a phone sheet's top edge up, and the tap would land below
 * the moved button, leaving the dialog open.
 */
export function DialogCloseButton({ onClose }) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Close"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClose}
    >
      <IconX size={20} aria-hidden="true" />
    </button>
  );
}
