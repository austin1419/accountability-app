// ─────────────────────────────────────────────
// ComplianceSection — Weekly / Monthly / Overall bars
//
// Three horizontal progress bars with percentage labels.
// ─────────────────────────────────────────────

import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";

type Props = {
  weekPercent:    number;
  monthPercent:   number;
  overallPercent: number;
};

function Bar({ label, percent }: { label: string; percent: number }) {
  const color = percent >= COMPLIANCE_TARGET ? "#B8933A" : "#7A1E1E";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-[#9A9080]">{label}</p>
        <p className={`text-xs font-semibold`} style={{ color }}>
          {percent}%
        </p>
      </div>
      <div className="h-1.5 bg-[#252525] rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ComplianceSection({ weekPercent, monthPercent, overallPercent }: Props) {
  return (
    <section className="bg-[#141414] rounded p-5 border border-[#252525]">
      <p
        className="text-xs uppercase tracking-widest text-[#9A9080] mb-4"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Compliance
      </p>

      <div className="space-y-4">
        <Bar label="This Week"  percent={weekPercent} />
        <Bar label="This Month" percent={monthPercent} />
        <Bar label="Overall"    percent={overallPercent} />
      </div>
    </section>
  );
}
