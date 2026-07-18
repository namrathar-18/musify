import { useId } from 'react';

// Musify brand mark: violet gradient tile + beamed eighth-notes.
// Single source of truth for the logo — the favicon in index.html mirrors it.
// The gradient id must be unique per instance: duplicated SVG ids resolve to
// the first DOM match, and if that copy is display:none the fill vanishes.
export const LogoMark = ({ size = 32 }) => {
  const gid = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Musify"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gid})`} />
      <g fill="#fff">
        <ellipse cx="17" cy="32.6" rx="4.6" ry="3.5" transform="rotate(-14 17 32.6)" />
        <ellipse cx="31.6" cy="29.8" rx="4.6" ry="3.5" transform="rotate(-14 31.6 29.8)" />
        <path d="M20.9 32.6V15.9l14.6-2.8v16.7h-2.6V18.3l-9.4 1.8v12.5z" />
      </g>
    </svg>
  );
};

export default function Logo({ size = 32, wordmark = true }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      {wordmark && (
        <span className="text-lg font-extrabold tracking-tight leading-none">Musify</span>
      )}
    </span>
  );
}
