/** The map pin with a smiling cloud head and a raindrop (UI-UX.md "Brand"). */
export function Logo({ size = 40, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 61c-1.3 0-2.4-.7-3-1.8L17.5 39.8A19 19 0 0 1 32 5a19 19 0 0 1 14.5 34.8L35 59.2c-.6 1.1-1.7 1.8-3 1.8z"
        fill="#3fb6ff"
        stroke="#1d1a3a"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 32a6 6 0 0 1 .8-11.9 9 9 0 0 1 17-1.6 6.6 6.6 0 0 1 1.8 13.5z"
        fill="#fff"
        stroke="#1d1a3a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 36.5c2.4 3 3.6 5 3.6 6.6a3.6 3.6 0 0 1-7.2 0c0-1.6 1.2-3.6 3.6-6.6z"
        fill="#ffd23f"
        stroke="#1d1a3a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="27.5" cy="25.5" r="1.6" fill="#1d1a3a" />
      <circle cx="35.5" cy="25.5" r="1.6" fill="#1d1a3a" />
      <path d="M29.5 28.5q2 1.8 4 0" fill="none" stroke="#1d1a3a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Logo plus "WeatherPing" in Fredoka. */
export function LogoWithName({ size = 40, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold ${className}`}>
      <Logo size={size} /> WeatherPing
    </span>
  );
}
