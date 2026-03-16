// ─────────────────────────────────────────────
// SectionHeader — reusable analytics section label
// ─────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-3">
      <h3
        className="text-[#F4EEE4] uppercase"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}
      >
        {title}
      </h3>
      {subtitle && (
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A", marginTop: "2px" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
