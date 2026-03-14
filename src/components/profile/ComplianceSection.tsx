import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";

type Props = {
  weekPercent:    number;
  monthPercent:   number;
  overallPercent: number;
};

const card: React.CSSProperties = {
  background: "#141414", border: "1px solid #252525", borderRadius: 10,
  padding: 16,
};

function Bar({ label, percent, isLast }: { label: string; percent: number; isLast?: boolean }) {
  const color = percent >= COMPLIANCE_TARGET ? "#B8933A" : "#7A1E1E";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: isLast ? 0 : 10,
    }}>
      {/* Label */}
      <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868" }}>
        {label}
      </span>

      {/* Track + percentage */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
        <div style={{ flex: 1, height: 4, background: "#252525", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: 4, borderRadius: 2, backgroundColor: color,
            width: `${percent}%`, transition: "width 0.5s ease",
          }} />
        </div>
        <span style={{
          fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.1em", color, minWidth: 36, textAlign: "right",
        }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function ComplianceSection({ weekPercent, monthPercent, overallPercent }: Props) {
  return (
    <section style={card}>
      <Bar label="This Week"  percent={weekPercent} />
      <Bar label="This Month" percent={monthPercent} />
      <Bar label="Overall"    percent={overallPercent} isLast />
    </section>
  );
}
