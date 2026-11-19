import { IconMapPinOff } from '@tabler/icons-react';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="box max-w-md p-8 text-center">
        <span className="mx-auto mb-3 grid size-16 place-items-center rounded-[20px] border-3 border-ink bg-sun-soft">
          <IconMapPinOff size={32} aria-hidden="true" />
        </span>
        <h1 className="text-[28px]">We couldn't find that page</h1>
        <p className="mt-1.5 mb-5 text-muted">The link may be old, or the page has moved.</p>
        <Link to="/" className="btn btn-sun">
          Go to WeatherPing
        </Link>
      </div>
    </main>
  );
}
