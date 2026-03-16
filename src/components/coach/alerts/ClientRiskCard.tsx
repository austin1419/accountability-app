// ─────────────────────────────────────────────
// ClientRiskCard — grouped alerts for one client
//
// Renders all alerts belonging to a single client
// in one card. Active signals shown first, resolved-
// today signals in a collapsed section. Each alert
// row is individually actionable.
// ─────────────────────────────────────────────

import { AlertSeverityChip } from "./AlertSeverityChip";
import { AlertCardActions } from "./AlertCardActions";
import type { AlertStatus, InterventionType } from "@/lib/coach/alerts/types";
import { INTERVENTION_LABELS } from "@/lib/coach/alerts/types";

export interface ClientAlert {
  alertType: string;
  severity: "critical" | "warning";
  priority: number;
  message: string;
  detailValue: string | null;
  status: AlertStatus;
  reviewedAt: string | null;
  resolvedAt: string | null;
  coachNote: string | null;
  interventionType: InterventionType | null;
  interventionNote: string | null;
  followUpDate: string | null;
}

interface ClientRiskCardProps {
  clientId: string;
  clientName: string;
  activeAlerts: ClientAlert[];
  resolvedTodayAlerts: ClientAlert[];
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

function highestSeverityBorder(alerts: ClientAlert[]): string {
  if (alerts.some((a) => a.severity === "critical")) return "#7A1E1E";
  if (alerts.some((a) => a.severity === "warning")) return "#B8933A";
  return "#0D3A25";
}

export function ClientRiskCard({
  clientId,
  clientName,
  activeAlerts,
  resolvedTodayAlerts,
}: ClientRiskCardProps) {
  const totalActive = activeAlerts.length;
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const borderColor = highestSeverityBorder(activeAlerts);

  return (
    <div
      className="rounded-[7px] border border-[#1A1A1A]"
      style={{
        background: "#0D0D0D",
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* ── Card Header ───────────────────────────── */}
      <div
        className="flex items-center justify-between gap-2"
        style={{ padding: "12px 16px", borderBottom: "1px solid #1A1A1A" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            href={`/coach/clients/${clientId}`}
            className="truncate no-underline hover:underline"
            style={{ fontFamily: ebGaramond, fontSize: "15px", fontWeight: 600, color: "#DDD5C0" }}
          >
            {clientName}
          </a>
          {/* Signal count badge */}
          <span
            className="rounded border flex-shrink-0"
            style={{
              fontFamily: cinzel,
              fontSize: "8px",
              fontWeight: 700,
              color: criticalCount > 0 ? "#7A1E1E" : "#B8933A",
              borderColor: criticalCount > 0 ? "#2A1010" : "#2A2010",
              background: criticalCount > 0 ? "rgba(122,30,30,0.10)" : "rgba(184,147,58,0.08)",
              padding: "2px 7px",
            }}
          >
            {totalActive} signal{totalActive !== 1 ? "s" : ""}
          </span>
        </div>
        <a
          href={`/coach/clients/${clientId}`}
          className="uppercase no-underline transition-colors hover:text-[#B8933A] flex-shrink-0"
          style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", color: "#F4EEE4" }}
        >
          View Profile &rarr;
        </a>
      </div>

      {/* ── Active Signals ────────────────────────── */}
      {activeAlerts.length > 0 && (
        <div style={{ padding: "10px 16px" }}>
          <span
            className="uppercase block mb-2"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#807868" }}
          >
            Active Signals
          </span>
          <div className="flex flex-col gap-[7px]">
            {activeAlerts.map((alert, idx) => (
              <AlertRow key={`${alert.alertType}-${idx}`} clientId={clientId} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* ── Resolved Today ────────────────────────── */}
      {resolvedTodayAlerts.length > 0 && (
        <div
          style={{ padding: "10px 16px", borderTop: "1px solid #1A1A1A", opacity: 0.7 }}
        >
          <span
            className="uppercase block mb-2"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#1D9E75" }}
          >
            Resolved Today
          </span>
          <div className="flex flex-col gap-[5px]">
            {resolvedTodayAlerts.map((alert, idx) => (
              <AlertRow key={`${alert.alertType}-resolved-${idx}`} clientId={clientId} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Alert Row (inline signal with actions) ───────────────────────

function AlertRow({ clientId, alert }: { clientId: string; alert: ClientAlert }) {
  const typeLabel = alert.alertType.replace(/_/g, " ");
  const isResolved = alert.status === "resolved";

  return (
    <div
      className="rounded-[5px] border border-[#1A1A1A]"
      style={{ background: "#111111", padding: "8px 10px" }}
    >
      {/* Top: type + severity + status */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="uppercase truncate"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#DDD5C0" }}
          >
            {typeLabel}
          </span>
          <AlertSeverityChip severity={alert.severity} />
        </div>
        <span
          className="uppercase flex-shrink-0"
          style={{
            fontFamily: cinzel,
            fontSize: "6px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: isResolved ? "#1D9E75" : "#4A3F2A",
          }}
        >
          {alert.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Message */}
      <p
        style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#807868", lineHeight: 1.4 }}
      >
        {alert.message}
      </p>

      {/* Detail value */}
      {alert.detailValue && (
        <p
          className="mt-0.5"
          style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}
        >
          {alert.detailValue}
        </p>
      )}

      {/* Intervention metadata (if recorded) */}
      {alert.interventionType && (
        <div className="mt-1 rounded border border-[#1A1A1A] bg-[#0D0D0D]" style={{ padding: "5px 8px" }}>
          <span style={{ fontFamily: ebGaramond, fontSize: "10px", fontWeight: 600, color: "#DDD5C0" }}>
            {INTERVENTION_LABELS[alert.interventionType] ?? alert.interventionType}
          </span>
          {alert.interventionNote && (
            <p style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#807868", marginTop: "1px" }}>
              {alert.interventionNote}
            </p>
          )}
          {alert.followUpDate && (
            <p style={{ fontFamily: ebGaramond, fontSize: "9px", color: "#B8933A", marginTop: "1px" }}>
              Follow-up: {new Date(alert.followUpDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-1.5">
        <AlertCardActions
          clientId={clientId}
          alertType={alert.alertType}
          currentStatus={alert.status}
        />
      </div>
    </div>
  );
}
