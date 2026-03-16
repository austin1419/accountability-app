// ─────────────────────────────────────────────
// TrendCard — compliance or progress trend display
// ─────────────────────────────────────────────

import { SectionHeader } from "./SectionHeader";

interface TrendSegment {
  label: string;
  value: number;
  color: string;
}

interface TrendCardProps {
  title: string;
  subtitle?: string;
  segments: TrendSegment[];
  emptyMessage?: string;
}

export function TrendCard({ title, subtitle, segments, emptyMessage }: TrendCardProps) {
  const hasData = segments.length > 0;

  return (
    <div
      className="rounded-[7px] border border-[#1A1A1A]"
      style={{ background: "#0D0D0D", padding: "16px 20px" }}
    >
      <SectionHeader title={title} subtitle={subtitle} />

      {!hasData ? (
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          {emptyMessage ?? "No data available."}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {segments.map((seg) => (
            <div key={seg.label}>
              <div className="flex items-center justify-between mb-1">
                <span
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", color: "#807868" }}
                  className="uppercase"
                >
                  {seg.label}
                </span>
                <span
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 700, color: seg.color }}
                >
                  {seg.value}%
                </span>
              </div>
              <div className="h-[5px] w-full rounded-full bg-[#1A1A1A]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(seg.value, 100)}%`, background: seg.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
