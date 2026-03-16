// ─────────────────────────────────────────────
// ClientTrendCard — Trending to Risk column card
// ─────────────────────────────────────────────

import Link from "next/link";

interface RosterClient {
  client_id: string;
  client_name: string;
  seven_day_pct: number;
  thirty_day_pct: number;
  today_pct: number;
  days_since_active: number | null;
  latest_stress: number | null;
  latest_energy: number | null;
}

interface ClientTrendCardProps {
  client: RosterClient;
}

function TrendBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[#807868] w-10 text-right flex-shrink-0"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.08em" }}
      >
        {label}
      </span>
      <div className="flex-1 h-[4px] bg-[#1A1A1A] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(pct, 100)}%`, transition: "width 0.4s ease" }}
        />
      </div>
      <span
        className="text-[#DDD5C0] w-8 flex-shrink-0"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 700 }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function ClientTrendCard({ client }: ClientTrendCardProps) {
  const delta = client.seven_day_pct - client.thirty_day_pct;
  const trendDown = delta < 0;
  const trendArrow = trendDown ? "↓" : delta > 0 ? "↑" : "→";
  const trendColor = trendDown ? "text-[#7A1E1E]" : delta > 0 ? "text-[#1D9E75]" : "text-[#807868]";

  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] flex flex-col gap-3"
      style={{ borderLeft: "3px solid #B8933A", padding: "14px 16px" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-[#DDD5C0] font-semibold truncate"
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "15px" }}
          >
            {client.client_name}
          </p>
          {/* goal_name not in payload — omit subtitle */}
        </div>
        <span className={`text-lg font-bold flex-shrink-0 ${trendColor}`}>
          {trendArrow}
        </span>
      </div>

      {/* Trend delta */}
      <div className="flex items-center gap-1.5">
        <span
          className={`font-bold ${trendColor}`}
          style={{ fontFamily: "'Cinzel', serif", fontSize: "13px" }}
        >
          {delta > 0 ? "+" : ""}{delta}%
        </span>
        <span
          className="text-[#4A3F2A]"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic" }}
        >
          7d vs 30d
        </span>
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-2">
        <TrendBar label="7-DAY" pct={client.seven_day_pct} color="bg-[#B8933A]" />
        <TrendBar label="30-DAY" pct={client.thirty_day_pct} color="bg-[#1D9E75]" />
      </div>

      {/* Stress / Energy signals if available */}
      {(client.latest_stress !== null || client.latest_energy !== null) && (
        <div className="flex items-center gap-3 pt-1 border-t border-[#1A1A1A]">
          {client.latest_stress !== null && (
            <span className="text-[#807868]" style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px" }}>
              Stress: <span className={client.latest_stress >= 4 ? "text-[#7A1E1E]" : "text-[#DDD5C0]"}>{client.latest_stress}/5</span>
            </span>
          )}
          {client.latest_energy !== null && (
            <span className="text-[#807868]" style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px" }}>
              Energy: <span className={client.latest_energy <= 2 ? "text-[#7A1E1E]" : "text-[#DDD5C0]"}>{client.latest_energy}/5</span>
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <Link
        href={`/coach/clients/${client.client_id}`}
        className="self-start text-[#F4EEE4] hover:text-[#B8933A] transition-colors"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}
      >
        View Profile →
      </Link>
    </div>
  );
}
