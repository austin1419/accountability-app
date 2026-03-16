// ─────────────────────────────────────────────
// AmbientBar — 2px roster health distribution bar
// ─────────────────────────────────────────────

interface AmbientBarProps {
  thriving: number;
  atRisk: number;
  critical: number;
  total: number;
}

export function AmbientBar({ thriving, atRisk, critical, total }: AmbientBarProps) {
  if (total === 0) {
    return <div className="h-[2px] w-full bg-[#1A1A1A]" />;
  }

  const goneDark = Math.max(0, total - thriving - atRisk - critical);
  const pct = (n: number) => (n / total) * 100;

  return (
    <div className="h-[2px] w-full flex">
      {thriving > 0 && (
        <div className="h-full bg-[#1D9E75]" style={{ width: `${pct(thriving)}%` }} />
      )}
      {atRisk > 0 && (
        <div className="h-full bg-[#B8933A]" style={{ width: `${pct(atRisk)}%` }} />
      )}
      {critical > 0 && (
        <div className="h-full bg-[#7A1E1E]" style={{ width: `${pct(critical)}%` }} />
      )}
      {goneDark > 0 && (
        <div className="h-full bg-[#2A2010]" style={{ width: `${pct(goneDark)}%` }} />
      )}
    </div>
  );
}
