// ─────────────────────────────────────────────
// ProgressRing — reusable SVG circular progress indicator
//
// Usage:
//   <ProgressRing percent={44} color="#3b82f6" />
//
// No libraries needed — just plain SVG math:
//   circumference = 2π × radius
//   offset = circumference × (1 - percent/100)
//   As offset shrinks, more of the arc becomes visible.
// ─────────────────────────────────────────────

type Props = {
  percent: number;      // 0–100
  size?: number;        // diameter in px (default 140)
  strokeWidth?: number; // ring thickness (default 12)
  color?: string;       // arc color (default PULSE gold)
};

export function ProgressRing({
  percent,
  size = 140,
  strokeWidth = 12,
  color = "#B8933A",
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    // -rotate-90 so the arc starts at the top (12 o'clock) instead of 3 o'clock
    <svg width={size} height={size} className="-rotate-90">
      {/* Dark track behind the colored arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#252525"
        strokeWidth={strokeWidth}
      />
      {/* Colored progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}
