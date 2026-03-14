"use client";

const cinzel = "'Cinzel', serif";

type Props = {
  actions: string[];
};

export function QuickActionChips({ actions }: Props) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 8,
    }}>
      {actions.map((action, i) => (
        <span
          key={i}
          style={{
            fontFamily: cinzel, fontSize: 8, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#B8933A",
            background: "rgba(184,147,58,0.06)",
            border: "1px solid #3A3020",
            borderRadius: 20, padding: "6px 14px",
            whiteSpace: "nowrap",
          }}
        >
          {action}
        </span>
      ))}
    </div>
  );
}
