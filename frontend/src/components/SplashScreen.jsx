import { Logo } from './Logo';

export function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <Logo size={80} className="bob" />
        <p className="font-display text-lg">Loading WeatherPing…</p>
      </div>
    </div>
  );
}
