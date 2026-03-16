// ─────────────────────────────────────────────
// RosterScorecard — Inline stat trio
// ─────────────────────────────────────────────

interface RosterScorecardProps {
  thriving: number;
  atRisk: number;
  critical: number;
}

function Col({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-3">
      <span className={color} style={{ fontFamily: "'Cinzel', serif", fontSize: "18px", fontWeight: 700 }}>
        {value}
      </span>
      <span
        className="text-[#807868] uppercase"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "5px", letterSpacing: "0.1em", fontWeight: 700 }}
      >
        {label}
      </span>
    </div>
  );
}

export function RosterScorecard({ thriving, atRisk, critical }: RosterScorecardProps) {
  return (
    <div className="flex items-center bg-[#0D0D0D] border border-[#1A1A1A] rounded-[5px]" style={{ padding: "5px 14px" }}>
      <Col value={thriving} label="Thriving" color="text-[#1D9E75]" />
      <div className="w-px h-6 bg-[#1A1A1A]" />
      <Col value={atRisk} label="At Risk" color="text-[#B8933A]" />
      <div className="w-px h-6 bg-[#1A1A1A]" />
      <Col value={critical} label="Critical" color="text-[#7A1E1E]" />
    </div>
  );
}
