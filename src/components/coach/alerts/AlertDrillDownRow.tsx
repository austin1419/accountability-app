// ─────────────────────────────────────────────
// AlertDrillDownRow — compact triage row for drill-down panel
// ─────────────────────────────────────────────

import type { AlertStatus } from "@/lib/coach/alerts/types";

export interface DrillDownRowData {
  clientId: string;
  clientName: string;
  alertType: string;
  severity: "critical" | "warning";
  message: string;
  status: AlertStatus;
  updatedAt: string | null;
}

const severityStripe: Record<string, string> = {
  critical: "#7A1E1E",
  warning: "#B8933A",
};

function actionLabel(status: AlertStatus): { text: string; color: string } {
  switch (status) {
    case "new":
    case "reviewed":
      return { text: "Act Now →", color: "#F4EEE4" };
    case "action_taken":
      return { text: "Follow Up →", color: "#B8933A" };
    case "resolved":
      return { text: "View →", color: "#1D9E75" };
  }
}

function relativeTime(ts: string | null): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function AlertDrillDownRow({ row }: { row: DrillDownRowData }) {
  const stripe = severityStripe[row.severity];
  const action = actionLabel(row.status);
  const typeLabel = row.alertType.replace(/_/g, " ");
  const time = relativeTime(row.updatedAt);

  return (
    <a
      href={`/coach/clients/${row.clientId}`}
      className="flex items-stretch gap-0 no-underline rounded-[5px] border border-[#1A1A1A] overflow-hidden transition-colors hover:border-[#2A2010]"
      style={{ background: "#111111" }}
    >
      {/* Severity stripe */}
      <div className="flex-shrink-0" style={{ width: "3px", background: stripe }} />

      {/* Content */}
      <div className="flex-1 min-w-0" style={{ padding: "8px 10px" }}>
        {/* Top line: name + severity chip */}
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="truncate"
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", fontWeight: 600, color: "#DDD5C0" }}
          >
            {row.clientName}
          </span>
          <span
            className="uppercase flex-shrink-0"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "6px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: stripe,
            }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Message (truncated) */}
        <p
          className="truncate"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", color: "#807868", lineHeight: 1.3 }}
        >
          {row.message}
        </p>

        {/* Bottom: status + time */}
        <div className="flex items-center gap-2 mt-1">
          <span
            className="uppercase"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#4A3F2A" }}
          >
            {row.status.replace(/_/g, " ")}
          </span>
          {time && (
            <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "9px", color: "#4A3F2A" }}>
              {time}
            </span>
          )}
        </div>
      </div>

      {/* Action link */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ padding: "0 10px" }}
      >
        <span
          className="uppercase"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.06em", color: action.color }}
        >
          {action.text}
        </span>
      </div>
    </a>
  );
}
