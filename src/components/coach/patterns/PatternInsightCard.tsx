// ─────────────────────────────────────────────
// PatternInsightCard — behavior pattern display
// ─────────────────────────────────────────────

import type { BehaviorPattern, PatternType, PatternSeverity } from "@/lib/coach/patterns/types";

const severityStyles: Record<PatternSeverity, { color: string; border: string; bg: string; dot: string }> = {
  critical: { color: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.10)", dot: "#7A1E1E" },
  warning:  { color: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.08)", dot: "#B8933A" },
  neutral:  { color: "#807868", border: "#1A1A1A", bg: "#0D0D0D",               dot: "#807868" },
  positive: { color: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.08)", dot: "#1D9E75" },
};

const severityLabels: Record<PatternSeverity, string> = {
  critical: "Critical",
  warning:  "Warning",
  neutral:  "Neutral",
  positive: "Positive",
};

const patternIcons: Record<PatternType, string> = {
  habit_failure_cluster: "◉",
  habit_streak:          "★",
  stress_rising:         "⚡",
  energy_declining:      "▽",
  compliance_momentum:   "△",
  intervention_loop:     "↻",
};

const patternLabels: Record<PatternType, string> = {
  habit_failure_cluster: "Habit Failure Cluster",
  habit_streak:          "Habit Streak",
  stress_rising:         "Stress Rising",
  energy_declining:      "Energy Declining",
  compliance_momentum:   "Compliance Momentum",
  intervention_loop:     "Intervention Loop",
};

interface PatternInsightCardProps {
  pattern: BehaviorPattern;
}

export function PatternInsightCard({ pattern }: PatternInsightCardProps) {
  const style = severityStyles[pattern.severity];
  const icon = patternIcons[pattern.patternType];
  const label = patternLabels[pattern.patternType];
  const sevLabel = severityLabels[pattern.severity];

  const confidencePct = Math.round(pattern.confidenceScore * 100);

  return (
    <div
      className="rounded-[7px] border"
      style={{
        background: style.bg,
        borderColor: style.border,
        borderLeft: `3px solid ${style.dot}`,
        padding: "12px 14px",
      }}
    >
      {/* Header: icon + pattern name + severity badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ fontSize: "12px", color: style.dot, flexShrink: 0 }}>{icon}</span>
          <span
            className="truncate uppercase"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: style.color }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="rounded border uppercase"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "6px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: style.color,
              borderColor: style.border,
              padding: "1px 5px",
            }}
          >
            {sevLabel}
          </span>
          <span
            style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "#4A3F2A" }}
          >
            {confidencePct}%
          </span>
        </div>
      </div>

      {/* Summary */}
      <p
        style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", color: "#DDD5C0", lineHeight: 1.5 }}
      >
        {pattern.summary}
      </p>

      {/* Related events count */}
      {pattern.relatedEventIds.length > 0 && (
        <p
          className="mt-1"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}
        >
          Based on {pattern.relatedEventIds.length} related event{pattern.relatedEventIds.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
