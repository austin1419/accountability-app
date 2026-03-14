"use client";

import type { ComplianceBar } from "@/lib/ai/types";

type Props = {
  bars: ComplianceBar[];
};

const cinzel = "'Cinzel', serif";

const barColors: Record<string, { fill: string; bg: string }> = {
  gold: { fill: "#B8933A", bg: "rgba(184,147,58,0.12)" },
  red:  { fill: "#7A1E1E", bg: "rgba(122,30,30,0.12)" },
};

export function ComplianceBars({ bars }: Props) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      borderTop: "1px solid #1E1E1E", paddingTop: 14,
    }}>
      {bars.map((bar) => {
        const colors = barColors[bar.status] ?? barColors.gold;
        return (
          <div key={bar.label}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 4,
            }}>
              <span style={{
                fontFamily: cinzel, fontSize: 8, fontWeight: 700,
                letterSpacing: "0.12em", color: "#807868",
                textTransform: "uppercase",
              }}>
                {bar.label}
              </span>
              <span style={{
                fontFamily: cinzel, fontSize: 11, fontWeight: 700,
                color: colors.fill,
              }}>
                {Math.round(bar.value)}%
              </span>
            </div>
            <div style={{
              height: 4, borderRadius: 2, background: colors.bg,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: colors.fill,
                width: `${Math.min(100, Math.max(0, bar.value))}%`,
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
