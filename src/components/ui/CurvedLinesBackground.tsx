/**
 * Decorative curved-line artwork for section backgrounds.
 * Purely presentational — absolutely positioned, non-interactive, and
 * meant to sit behind real content (place it first inside a
 * `position: relative` wrapper, then z-index the content above it).
 */
export default function CurvedLinesBackground({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 640"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <path
        d="M-100 120C180 40 340 220 640 160C940 100 1080 260 1380 180"
        stroke="#2563EB"
        strokeOpacity="0.4"
        strokeWidth="2.5"
      />
      <path
        d="M-100 260C220 340 380 140 700 220C1020 300 1140 120 1440 220"
        stroke="#1D4ED8"
        strokeOpacity="0.3"
        strokeWidth="2.5"
      />
      <path
        d="M-100 420C240 480 420 320 760 400C1100 480 1220 340 1540 420"
        stroke="#0EA5E9"
        strokeOpacity="0.35"
        strokeWidth="2.5"
      />
      <path
        d="M-100 40C160 120 300 -40 620 60C940 160 1060 0 1380 90"
        stroke="#0EA5E9"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M-100 560C200 500 380 620 700 540C1020 460 1160 600 1440 540"
        stroke="#2563EB"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
    </svg>
  );
}
