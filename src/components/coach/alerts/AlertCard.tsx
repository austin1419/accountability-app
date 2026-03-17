// ─────────────────────────────────────────────
// AlertCard — individual alert for coach alerts page
//
// Displays client name, alert type, severity,
// description, trigger condition, suggested action,
// lifecycle status, and action buttons.
// Links to the client profile.
// ─────────────────────────────────────────────

import { AlertSeverityChip } from "./AlertSeverityChip";
import { AlertCardActions } from "./AlertCardActions";
import type { AlertStatus, InterventionType } from "@/lib/coach/alerts/types";
import { INTERVENTION_LABELS } from "@/lib/coach/alerts/types";

interface AlertCardProps {
  clientId: string;
  clientName: string;
  alertType: string;
  severity: "critical" | "warning";
  message: string;
  detailValue: string | null;
  suggestedAction: string;
  status: AlertStatus;
  reviewedAt: string | null;
  resolvedAt: string | null;
  coachNote: string | null;
  interventionType: InterventionType | null;
  interventionNote: string | null;
  followUpDate: string | null;
}

const accentBorder = {
  critical: "#7A1E1E",
  warning: "#B8933A",
};

const statusLabels: Record<AlertStatus, { label: string; color: string }> = {
  new:          { label: "New",            color: "#F4EEE4" },
  reviewed:     { label: "Reviewed",       color: "#B8933A" },
  action_taken: { label: "Action Taken",   color: "#B8933A" },
  intervention: { label: "Intervention",   color: "#B8933A" },
  resolved:     { label: "Resolved",       color: "#1D9E75" },
};

export function AlertCard({
  clientId,
  clientName,
  alertType,
  severity,
  message,
  detailValue,
  suggestedAction,
  status,
  reviewedAt,
  resolvedAt,
  coachNote,
  interventionType,
  interventionNote,
  followUpDate,
}: AlertCardProps) {
  const typeLabel = alertType.replace(/_/g, " ");
  const isResolved = status === "resolved";
  const statusInfo = statusLabels[status];

  return (
    <div
      className="rounded-[7px] border border-[#1A1A1A] transition-colors hover:border-[#2A2010]"
      style={{
        background: "#0D0D0D",
        borderLeft: `3px solid ${isResolved ? "#0D3A25" : accentBorder[severity]}`,
        padding: "14px 16px",
        opacity: isResolved ? 0.7 : 1,
      }}
    >
      {/* Header row: name + severity chip + status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <a
          href={`/coach/clients/${clientId}`}
          className="truncate no-underline hover:underline"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "14px", fontWeight: 600, color: "#DDD5C0" }}
        >
          {clientName}
        </a>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Status badge */}
          <span
            className="rounded border uppercase"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "7px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: statusInfo.color,
              borderColor: "#1A1A1A",
              background: "transparent",
              padding: "2px 6px",
            }}
          >
            {statusInfo.label}
          </span>
          <AlertSeverityChip severity={severity} />
        </div>
      </div>

      {/* Alert type label */}
      <span
        className="uppercase block mb-1.5"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "#807868" }}
      >
        {typeLabel}
      </span>

      {/* Alert message */}
      <p
        className="mb-1.5"
        style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", color: "#807868", lineHeight: 1.5 }}
      >
        {message}
      </p>

      {/* Trigger condition (detail value) */}
      {detailValue && (
        <p
          className="mb-1.5"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}
        >
          Trigger: {detailValue}
        </p>
      )}

      {/* Coach note */}
      {coachNote && (
        <p
          className="mb-1.5"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#807868" }}
        >
          Coach note: {coachNote}
        </p>
      )}

      {/* Intervention metadata */}
      {interventionType && (
        <div
          className="rounded-[5px] border border-[#1A1A1A] mb-1.5"
          style={{ background: "#111111", padding: "8px 10px" }}
        >
          <span
            className="uppercase block mb-1"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "6px", fontWeight: 700, letterSpacing: "0.1em", color: "#4A3F2A" }}
          >
            Intervention
          </span>
          <span
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontWeight: 600, color: "#DDD5C0" }}
          >
            {INTERVENTION_LABELS[interventionType] ?? interventionType}
          </span>
          {interventionNote && (
            <p
              className="mt-0.5"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#807868", lineHeight: 1.4 }}
            >
              {interventionNote}
            </p>
          )}
          {followUpDate && (
            <p
              className="mt-0.5"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", color: "#B8933A" }}
            >
              Follow-up: {new Date(followUpDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Timestamps */}
      {(reviewedAt || resolvedAt) && (
        <div className="flex items-center gap-3 mb-1.5">
          {reviewedAt && (
            <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", color: "#4A3F2A" }}>
              Reviewed {new Date(reviewedAt).toLocaleDateString()}
            </span>
          )}
          {resolvedAt && (
            <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", color: "#1D9E75" }}>
              Resolved {new Date(resolvedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Suggested action */}
      {!isResolved && (
        <div
          className="mt-2 pt-2"
          style={{ borderTop: "1px solid #1A1A1A" }}
        >
          <span
            className="uppercase"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#4A3F2A" }}
          >
            Suggested Action
          </span>
          <p
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", color: "#807868", marginTop: "2px", lineHeight: 1.4 }}
          >
            {suggestedAction}
          </p>
        </div>
      )}

      {/* Action buttons + profile link */}
      <div
        className="mt-2.5 pt-2 flex items-center justify-between"
        style={{ borderTop: "1px solid #1A1A1A" }}
      >
        <AlertCardActions
          clientId={clientId}
          alertType={alertType}
          currentStatus={status}
        />
        <a
          href={`/coach/clients/${clientId}`}
          className="uppercase no-underline transition-colors hover:text-[#B8933A]"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", color: "#F4EEE4" }}
        >
          View Profile &rarr;
        </a>
      </div>
    </div>
  );
}
