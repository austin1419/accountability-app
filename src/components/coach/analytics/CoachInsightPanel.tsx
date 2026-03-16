// ─────────────────────────────────────────────
// CoachInsightPanel — deterministic summary panel
//
// Renders actionable insights derived from roster
// data. Designed for future alert expansion.
// ─────────────────────────────────────────────

import { SectionHeader } from "./SectionHeader";

interface Insight {
  icon: string;
  text: string;
  accent: "green" | "gold" | "crimson" | "neutral";
}

interface CoachInsightPanelProps {
  insights: Insight[];
}

const insightColors = {
  green:   "#1D9E75",
  gold:    "#B8933A",
  crimson: "#7A1E1E",
  neutral: "#807868",
};

export function CoachInsightPanel({ insights }: CoachInsightPanelProps) {
  return (
    <div
      className="rounded-[7px] border border-[#1A1A1A]"
      style={{ background: "#0D0D0D", padding: "16px 20px" }}
    >
      <SectionHeader title="Coach Insights" subtitle="Deterministic signals from your roster" />

      {insights.length === 0 ? (
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          No actionable signals right now. Your roster is stable.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-[5px] border border-[#1A1A1A] px-3 py-2"
              style={{ background: "#111111" }}
            >
              <span style={{ fontSize: "12px", lineHeight: 1.4 }}>{insight.icon}</span>
              <p
                style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", color: insightColors[insight.accent], lineHeight: 1.5 }}
              >
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
