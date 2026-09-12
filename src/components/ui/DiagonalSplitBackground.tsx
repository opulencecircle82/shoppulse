/**
 * Full-bleed two-tone background split by a soft wavy diagonal — blue on
 * top, orange on bottom, matching the app's own button-gradient colors so
 * it reads as ShopPulse branding rather than an arbitrary color choice.
 * Purely decorative: absolutely positioned behind real content, place it
 * first inside a `position: relative` wrapper and z-index content above it.
 */
export default function DiagonalSplitBackground({
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
          <linearGradient id="diagonal-split-blue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 L100,0 L100,75 C85,70 65,90 50,105 C45,120 25,115 0,95 Z"
          fill="url(#diagonal-split-blue)"
        />
      </svg>
    </div>
  );
}
