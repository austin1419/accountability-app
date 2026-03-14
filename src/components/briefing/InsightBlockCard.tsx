"use client";

import type { InsightBlock } from "@/lib/ai/types";

type Props = {
  block: InsightBlock;
};

const cinzel = "'Cinzel', serif";
const garamond = "'EB Garamond', serif";

const tagColors: Record<string, { color: string; bg: string; border: string }> = {
  gold: { color: "#B8933A", bg: "rgba(184,147,58,0.08)", border: "#3A3020" },
  red:  { color: "#8C2424", bg: "rgba(122,30,30,0.08)",  border: "#3A1A1A" },
  blue: { color: "#4A6A8A", bg: "rgba(74,106,138,0.08)",  border: "#2A3A4A" },
  gray: { color: "#807868", bg: "rgba(128,120,104,0.06)", border: "#2A2A2A" },
};

export function InsightBlockCard({ block }: Props) {
  const colors = tagColors[block.tagType] ?? tagColors.gray;

  return (
    <div style={{
      background: "#111111", border: "1px solid #1E1E1E",
      borderRadius: 8, padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      {/* Tag + priority */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontFamily: cinzel, fontSize: 7, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: colors.color,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 3, padding: "1px 6px",
        }}>
          {block.tag}
        </span>
        {block.priority === "high" && (
          <span style={{
            fontFamily: cinzel, fontSize: 6, fontWeight: 700,
            letterSpacing: "0.1em", color: "#8C2424",
            textTransform: "uppercase",
          }}>
            HIGH
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{
        fontFamily: garamond, fontSize: 14, fontWeight: 500,
        color: "#F4EEE4", margin: 0, lineHeight: 1.3,
      }}>
        {block.title}
      </p>

      {/* Summary */}
      <p style={{
        fontFamily: garamond, fontSize: 13, color: "#807868",
        margin: 0, lineHeight: 1.4,
      }}>
        {block.summary}
      </p>
    </div>
  );
}
