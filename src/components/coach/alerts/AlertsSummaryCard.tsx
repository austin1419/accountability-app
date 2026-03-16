// ─────────────────────────────────────────────
// AlertsSummaryCard — top-level alert count metric
// ─────────────────────────────────────────────

interface AlertsSummaryCardProps {
  label: string;
  count: number;
  accent: "crimson" | "gold" | "green" | "neutral";
  subtext?: string;
}

const accentMap = {
  crimson: { text: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.10)" },
  gold:    { text: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.08)" },
  green:   { text: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.08)" },
  neutral: { text: "#807868", border: "#1A1A1A", bg: "#0D0D0D" },
};

export function AlertsSummaryCard({ label, count, accent, subtext }: AlertsSummaryCardProps) {
  const a = accentMap[accent];

  return (
    <div
      className="rounded-[7px] border flex flex-col items-center justify-center"
      style={{ background: a.bg, borderColor: a.border, padding: "14px 16px" }}
    >
      <span
        style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900, color: a.text, lineHeight: 1 }}
      >
        {count}
      </span>
      <span
        className="mt-1 uppercase"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#807868" }}
      >
        {label}
      </span>
      {subtext && (
        <span
          className="mt-0.5"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}
        >
          {subtext}
        </span>
      )}
    </div>
  );
}
