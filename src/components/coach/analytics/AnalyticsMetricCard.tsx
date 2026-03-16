// ─────────────────────────────────────────────
// AnalyticsMetricCard — top-level summary metric
// ─────────────────────────────────────────────

interface AnalyticsMetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: "green" | "gold" | "crimson" | "neutral";
}

const accentMap = {
  green:   { text: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.08)" },
  gold:    { text: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.08)" },
  crimson: { text: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.10)" },
  neutral: { text: "#F4EEE4", border: "#1A1A1A", bg: "#0D0D0D" },
};

export function AnalyticsMetricCard({ label, value, subtext, accent = "neutral" }: AnalyticsMetricCardProps) {
  const a = accentMap[accent];

  return (
    <div
      className="rounded-[7px] border flex flex-col items-center justify-center"
      style={{ background: a.bg, borderColor: a.border, padding: "14px 16px" }}
    >
      <span
        style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900, color: a.text, lineHeight: 1 }}
      >
        {value}
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
