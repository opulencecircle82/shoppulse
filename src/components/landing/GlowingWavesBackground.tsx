/**
 * Bold glowing light-streak backdrop for the landing page hero — soft
 * blurred blue arcs sweeping across the navy background, in place of the
 * thin subtle lines used as chrome elsewhere in the app. Purely
 * decorative: absolutely positioned behind real content, place it first
 * inside a `position: relative` wrapper and z-index content above it.
 */
export default function GlowingWavesBackground({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 800"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <filter id="glow-blur-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="36" />
        </filter>
        <filter id="glow-blur-tight" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <g filter="url(#glow-blur-soft)">
        <path
          d="M-200 620C120 700 280 440 620 480C960 520 1080 320 1500 380"
          stroke="#1D4ED8"
          strokeOpacity="0.45"
          strokeWidth="70"
        />
        <path
          d="M-200 460C160 540 340 260 700 320C1060 380 1180 160 1560 240"
          stroke="#2563EB"
          strokeOpacity="0.4"
          strokeWidth="55"
        />
        <path
          d="M-200 280C200 360 420 80 780 140C1140 200 1260 0 1600 80"
          stroke="#0EA5E9"
          strokeOpacity="0.35"
          strokeWidth="40"
        />
        <path
          d="M-200 90C220 20 460 220 820 150C1180 80 1300 260 1640 160"
          stroke="#1D4ED8"
          strokeOpacity="0.3"
          strokeWidth="45"
        />
      </g>

      <g filter="url(#glow-blur-tight)">
        <path
          d="M-200 540C160 610 320 360 660 410C1000 460 1120 260 1520 320"
          stroke="#38BDF8"
          strokeOpacity="0.55"
          strokeWidth="4"
        />
        <path
          d="M-200 340C180 420 380 140 740 200C1100 260 1220 60 1580 140"
          stroke="#7DD3FC"
          strokeOpacity="0.5"
          strokeWidth="3"
        />
        <path
          d="M-200 130C200 60 440 240 800 170C1160 100 1280 260 1620 180"
          stroke="#7DD3FC"
          strokeOpacity="0.4"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}
