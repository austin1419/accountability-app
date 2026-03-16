// ─────────────────────────────────────────────
// ClientWinCard — Thriving column card
// ─────────────────────────────────────────────

import Link from "next/link";

interface RosterClient {
  client_id: string;
  client_name: string;
  today_pct: number;
  seven_day_pct: number;
  thirty_day_pct: number;
  days_since_active: number | null;
}

interface ClientWinCardProps {
  client: RosterClient;
}

function headlineValue(client: RosterClient): string {
  // Priority: goal_completed (missing), streak (missing), thirty_day_pct, fallback
  if (client.thirty_day_pct > 0) return `${client.thirty_day_pct}%`;
  return "—";
}

function headlineLabel(client: RosterClient): string {
  if (client.thirty_day_pct > 0) return "30-DAY COMPLIANCE";
  return "COMPLIANCE";
}

function coachingNote(client: RosterClient): string {
  // Priority: goal_completed (missing), streak >= 14 (missing), streak >= 7 (missing),
  // thirty_day_pct >= 90, otherwise maintain momentum
  if (client.thirty_day_pct >= 90) return "Name what is working. Reinforce the system.";
  if (client.thirty_day_pct >= 80) return "Strong momentum. Reinforce consistency.";
  return "Maintain momentum. Keep showing up.";
}

export function ClientWinCard({ client }: ClientWinCardProps) {
  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] flex flex-col gap-3"
      style={{ borderLeft: "3px solid #1D9E75", padding: "14px 16px" }}
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
        <div
          className="w-[6px] h-[6px] rounded-full bg-[#1D9E75] flex-shrink-0 mt-2"
          title="Thriving"
        />
      </div>

      {/* Headline stat */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-[#1D9E75]"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900 }}
        >
          {headlineValue(client)}
        </span>
        <span
          className="text-[#4A3F2A] uppercase"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.1em", fontWeight: 700 }}
        >
          {headlineLabel(client)}
        </span>
      </div>

      {/* Compliance mini row */}
      <div className="flex items-center gap-4">
        {[
          { label: "Today", pct: client.today_pct },
          { label: "7-Day", pct: client.seven_day_pct },
          { label: "30-Day", pct: client.thirty_day_pct },
        ].map(({ label, pct }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-[#DDD5C0]" style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 700 }}>
              {pct}%
            </span>
            <span className="text-[#4A3F2A]" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.08em" }}>
              {label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Coaching note */}
      <div className="pt-2 border-t border-[#1A1A1A]">
        <p
          className="text-[#807868]"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic" }}
        >
          {coachingNote(client)}
        </p>
      </div>

      {/* Action */}
      <Link
        href={`/coach/clients/${client.client_id}`}
        className="self-start text-[#F4EEE4] hover:text-[#1D9E75] transition-colors"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}
      >
        View Profile →
      </Link>
    </div>
  );
}
