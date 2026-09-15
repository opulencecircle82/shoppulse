/**
 * Full-bleed background with an organic wavy blob (not a straight
 * diagonal) in the ShopPulse blue-to-orange gradient — blue blob over an
 * orange base, echoing the curved hero shapes common in banking/fintech
 * app login screens. Purely decorative: absolutely positioned behind
 * real content, place it first inside a `position: relative` wrapper and
 * z-index content above it.
 */
export default function CurvedBlobBackground({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-brand-orange-dark" />
      <svg
        viewBox="0 0 100 200"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="curved-blob-blue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 L100,0 L100,34 C86,42 80,24 66,31 C53,38 60,56 44,52 C29,48 33,66 18,62 C9,59 5,68 0,74 Z"
          fill="url(#curved-blob-blue)"
        />
        <path
          d="M0,148 C11,145 15,163 6,170 C1,173 0,160 0,148 Z"
          fill="url(#curved-blob-blue)"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
