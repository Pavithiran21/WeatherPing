// The cartoon sun and rain cloud from the design. Decorative only (aria-hidden).
// Only the login page and the empty state animate them; the CSS stops the motion
// under prefers-reduced-motion.

export function SunArt({ size = 150, animated = false, className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} style={style} aria-hidden="true">
      <g
        className={animated ? 'rays-spin' : undefined}
        stroke="#1d1a3a"
        strokeWidth="4"
        strokeLinecap="round"
        fill="#ffd23f"
      >
        <path d="M60 6v14M60 100v14M6 60h14M100 60h14M22 22l10 10M88 88l10 10M22 98l10-10M88 32l10-10" />
      </g>
      <circle cx="60" cy="60" r="30" fill="#ffd23f" stroke="#1d1a3a" strokeWidth="4" />
      <circle cx="50" cy="56" r="3.5" fill="#1d1a3a" />
      <circle cx="70" cy="56" r="3.5" fill="#1d1a3a" />
      <path d="M50 67q10 9 20 0" fill="none" stroke="#1d1a3a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="42" cy="65" r="4" fill="#ff6b5b" opacity=".6" />
      <circle cx="78" cy="65" r="4" fill="#ff6b5b" opacity=".6" />
    </svg>
  );
}

const DROP = 'c3 4 4.5 6.5 4.5 8.5a4.5 4.5 0 0 1-9 0c0-2 1.5-4.5 4.5-8.5z';

export function CloudArt({ width = 170, height = 145, rain = true, animated = false, className, style }) {
  const dropClass = animated ? 'drip' : undefined;
  return (
    <svg width={width} height={height} viewBox="0 0 140 120" className={className} style={style} aria-hidden="true">
      <path
        d="M36 76a20 20 0 0 1 3-39.7A30 30 0 0 1 96 34a22 22 0 0 1 8 42z"
        fill="#fff"
        stroke="#1d1a3a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="58" cy="54" r="3.5" fill="#1d1a3a" />
      <circle cx="80" cy="54" r="3.5" fill="#1d1a3a" />
      <path d="M62 62q7 6 14 0" fill="none" stroke="#1d1a3a" strokeWidth="3.5" strokeLinecap="round" />
      {rain && (
        <g stroke="#1d1a3a" strokeWidth="3" fill="#3fb6ff">
          <path className={dropClass} d={`M48 84${DROP}`} />
          <path className={dropClass} style={{ animationDelay: '.35s' }} d={`M70 84${DROP}`} />
          <path className={dropClass} style={{ animationDelay: '.7s' }} d={`M92 84${DROP}`} />
        </g>
      )}
    </svg>
  );
}
