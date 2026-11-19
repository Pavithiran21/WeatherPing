import { IconMapPinPlus } from '@tabler/icons-react';
import { Logo } from '../../components/Logo';

/** Mint card for a user with no places yet (dashboard and Rules page empty states). The logo bobs. */
export function AddFirstSpotCard({ title, text, onAddSpot }) {
  return (
    <section className="box mx-auto max-w-md bg-mint-soft p-6 text-center" aria-labelledby="first-spot-title">
      <Logo size={80} className="bob mx-auto" />
      <h2 id="first-spot-title" className="mt-1.5 text-[22px]">
        {title}
      </h2>
      <p className="mt-1.5 mb-3.5 text-sm text-muted">{text}</p>
      <button type="button" className="btn btn-sun" onClick={onAddSpot}>
        <IconMapPinPlus size={20} aria-hidden="true" /> Add a spot
      </button>
    </section>
  );
}
