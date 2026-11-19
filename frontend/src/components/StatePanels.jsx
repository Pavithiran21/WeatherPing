import { IconRefresh } from '@tabler/icons-react';

// The loading and error panels from UI-UX.md "States", shared by the dashboard and the Rules page.

/** "Loading forecast…" with skeleton bars. */
export function LoadingCard({ label, className = '' }) {
  return (
    <section className={`box p-5 ${className}`} aria-busy="true">
      <p className="font-display text-base">{label}</p>
      <div className="skel w-[45%]" style={{ height: 26 }} />
      <div className="skel" />
      <div className="skel w-[70%]" />
    </section>
  );
}

/** Coral panel with a "Try again" button; children add more buttons next to it. */
export function ErrorPanel({ icon: Icon, title, text, onRetry, children, className = '' }) {
  return (
    <section className={`box bg-coral-soft p-5 text-center ${className}`} role="alert">
      <Icon size={46} className="mx-auto" aria-hidden="true" />
      <h3 className="text-[22px]">{title}</h3>
      {text && <p className="mt-1.5 mb-3.5 text-sm">{text}</p>}
      <div className="flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn btn-white" onClick={onRetry}>
          <IconRefresh size={20} aria-hidden="true" /> Try again
        </button>
        {children}
      </div>
    </section>
  );
}
