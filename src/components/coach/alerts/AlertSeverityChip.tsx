// ─────────────────────────────────────────────
// AlertSeverityChip — severity badge for alert cards
// ─────────────────────────────────────────────

interface AlertSeverityChipProps {
  severity: "critical" | "warning";
}

const styles = {
  critical: {
    text: "#7A1E1E",
    border: "#2A1010",
    bg: "rgba(122,30,30,0.10)",
    label: "Critical",
  },
  warning: {
    text: "#B8933A",
    border: "#2A2010",
    bg: "rgba(184,147,58,0.08)",
    label: "Warning",
  },
};

export function AlertSeverityChip({ severity }: AlertSeverityChipProps) {
  const s = styles[severity];

  return (
    <span
      className="rounded border uppercase"
      style={{
        fontFamily: "'Cinzel', serif",
        fontSize: "7px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: s.text,
        borderColor: s.border,
        background: s.bg,
        padding: "2px 6px",
      }}
    >
      {s.label}
    </span>
  );
}
