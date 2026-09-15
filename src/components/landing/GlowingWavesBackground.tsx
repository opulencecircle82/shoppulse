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
      preserveAspectRatio="xMidYMid slice"
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
          d="M-200 700C120 780 280 520 620 560C960 600 1080 400 1500 460"
          stroke="#1D4ED8"
          strokeOpacity="0.45"
          strokeWidth="70"
        />
        <path
          d="M-200 560C160 640 340 360 700 420C1060 480 1180 260 1560 340"
          stroke="#2563EB"
          strokeOpacity="0.4"
          strokeWidth="55"
        />
        <path
          d="M-200 420C200 500 420 220 780 280C1140 340 1260 140 1600 220"
          stroke="#0EA5E9"
          strokeOpacity="0.35"
          strokeWidth="40"
        />
      </g>

      <g filter="url(#glow-blur-tight)">
        <path
          d="M-200 620C160 690 320 440 660 490C1000 540 1120 340 1520 400"
          stroke="#38BDF8"
          strokeOpacity="0.55"
          strokeWidth="4"
        />
        <path
          d="M-200 480C180 560 380 280 740 340C1100 400 1220 200 1580 280"
          stroke="#7DD3FC"
          strokeOpacity="0.5"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}
