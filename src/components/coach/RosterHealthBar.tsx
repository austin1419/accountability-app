// ─────────────────────────────────────────────
// RosterHealthBar — Full-width distribution bar with labels
// ─────────────────────────────────────────────

interface RosterHealthBarProps {
  thriving: number;
  atRisk: number;
  critical: number;
  total: number;
}

function Segment({ count, total, color, label }: { count: number; total: number; color: string; label: string }) {
  if (count === 0) return null;
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: `${(count / total) * 100}%`, minWidth: "40px" }}>
      <div className={`h-[6px] w-full rounded-full ${color}`} />
      <div className="flex items-center gap-1">
        <span
          className="text-[#807868]"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em" }}
        >
          {label}
        </span>
        <span
          className="text-[#4A3F2A]"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px" }}
        >
          {count} ({pct}%)
        </span>
      </div>
    </div>
  );
}

export function RosterHealthBar({ thriving, atRisk, critical, total }: RosterHealthBarProps) {
  if (total === 0) {
    return (
      <div className="w-full">
        <div className="h-[6px] w-full rounded-full bg-[#1A1A1A]" />
        <p
          className="text-center mt-2 text-[#4A3F2A]"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic" }}
        >
          No clients in roster.
        </p>
      </div>
    );
  }

  const goneDark = Math.max(0, total - thriving - atRisk - critical);

  return (
    <div className="w-full flex gap-[2px]">
      <Segment count={thriving} total={total} color="bg-[#1D9E75]" label="THRIVING" />
      <Segment count={atRisk} total={total} color="bg-[#B8933A]" label="AT RISK" />
      <Segment count={critical} total={total} color="bg-[#7A1E1E]" label="CRITICAL" />
      {goneDark > 0 && (
        <Segment count={goneDark} total={total} color="bg-[#2A2010]" label="GONE DARK" />
      )}
    </div>
  );
}
