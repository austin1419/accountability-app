// ─────────────────────────────────────────────
// ClientAlertCard — Needs Attention column card
// ─────────────────────────────────────────────

import Link from "next/link";

interface RosterClient {
  client_id: string;
  client_name: string;
  status_label: "thriving" | "at_risk" | "critical" | "gone_dark";
  today_pct: number;
  seven_day_pct: number;
  thirty_day_pct: number;
  days_since_active: number | null;
  latest_stress: number | null;
  latest_energy: number | null;
}

interface Alert {
  client_id: string;
  alert_type: string;
  alert_priority: number;
  alert_message: string;
  detail_value: string | null;
}

interface ClientAlertCardProps {
  client: RosterClient;
  alerts: Alert[];
}

function accentColor(status: string, alerts: Alert[]): string {
  const hasUrgent = alerts.some((a) => a.alert_priority <= 1);
  if (status === "critical" || hasUrgent) return "#7A1E1E";
  if (status === "gone_dark") return "#4A3F2A";
  return "#B8933A";
}

function actionLabel(status: string, alerts: Alert[]): string {
  const hasUrgent = alerts.some((a) => a.alert_priority <= 1);
  if (status === "critical" || hasUrgent) return "Call Now →";
  if (status === "gone_dark") return "Check In →";
  return "View Profile →";
}

function ComplianceChip({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= 70 ? "text-[#1D9E75] border-[#0D3A25]" :
    pct >= 40 ? "text-[#B8933A] border-[#2A2010]" :
                "text-[#7A1E1E] border-[#2A1010]";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded border ${color}`}
        style={{ fontFamily: "'Cinzel', serif", fontSize: "11px" }}
      >
        {pct}%
      </span>
      <span className="text-[#4A3F2A]" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.08em" }}>
        {label}
      </span>
    </div>
  );
}

export function ClientAlertCard({ client, alerts }: ClientAlertCardProps) {
  const accent = accentColor(client.status_label, alerts);
  const topAlert = alerts.length > 0 ? alerts.sort((a, b) => a.alert_priority - b.alert_priority)[0] : null;

  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] flex flex-col gap-3"
      style={{ borderLeft: `3px solid ${accent}`, padding: "14px 16px" }}
    >
      {/* Client name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-[#DDD5C0] font-semibold truncate"
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "15px" }}
          >
            {client.client_name}
          </p>
          {/* goal_name not in payload — omit subtitle rather than show misleading fallback */}
        </div>
        {client.days_since_active !== null && client.days_since_active >= 3 && (
          <span
            className="text-[#807868] border border-[#2A2010] px-2 py-0.5 rounded flex-shrink-0"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 600 }}
          >
            {client.days_since_active}d dark
          </span>
        )}
      </div>

      {/* Top alert message */}
      {topAlert && (
        <p className="text-[#807868]" style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px" }}>
          {topAlert.alert_message}
        </p>
      )}

      {/* Alert type chips */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {alerts.slice(0, 3).map((a) => (
            <span
              key={a.alert_type}
              className="text-[#807868] border border-[#1A1A1A] bg-[rgba(122,30,30,0.06)] px-1.5 py-0.5 rounded"
              style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em" }}
            >
              {a.alert_type.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Compliance row */}
      <div className="flex items-center gap-3">
        <ComplianceChip label="TODAY" pct={client.today_pct} />
        <ComplianceChip label="7-DAY" pct={client.seven_day_pct} />
        <ComplianceChip label="30-DAY" pct={client.thirty_day_pct} />
      </div>

      {/* Action link */}
      <Link
        href={`/coach/clients/${client.client_id}`}
        className="mt-1 self-start text-[#F4EEE4] hover:text-[#B8933A] transition-colors"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}
      >
        {actionLabel(client.status_label, alerts)}
      </Link>
    </div>
  );
}
