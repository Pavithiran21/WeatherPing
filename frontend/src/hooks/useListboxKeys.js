import { useState } from 'react';

/**
 * Keyboard support for a text field with a list of options under it
 * (UI-UX.md: Up and Down move through the options, Enter picks one, Esc closes the list).
 * activeIndex is the highlighted option, shown with aria-activedescendant.
 */
export function useListboxKeys({ optionCount, isOpen, onPick, onClose }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  function onKeyDown(event) {
    if (!isOpen || optionCount === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, optionCount - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault(); // Pick the option instead of submitting the form.
      onPick(activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault(); // Close the list first, not the dialog around it.
      onClose();
    }
  }

  return { activeIndex, setActiveIndex, onKeyDown };
}
