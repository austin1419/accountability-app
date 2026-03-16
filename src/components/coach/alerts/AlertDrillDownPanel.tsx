// ─────────────────────────────────────────────
// AlertDrillDownPanel — right-side slide-over for triage
//
// Renders a filtered compact list of alert rows.
// Receives pre-built row data — no data fetching.
// ─────────────────────────────────────────────

import { AlertDrillDownRow } from "./AlertDrillDownRow";
import type { DrillDownRowData } from "./AlertDrillDownRow";

export type DrillDownFilter = "at_risk" | "critical" | "warning" | "resolved";

interface AlertDrillDownPanelProps {
  filter: DrillDownFilter;
  rows: DrillDownRowData[];
  onClose: () => void;
}

const filterTitles: Record<DrillDownFilter, string> = {
  at_risk:  "Clients at Risk",
  critical: "Critical Signals",
  warning:  "Warning Signals",
  resolved: "Resolved Today",
};

const filterEmptyMessages: Record<DrillDownFilter, string> = {
  at_risk:  "No clients currently at risk.",
  critical: "No critical signals active.",
  warning:  "No warning signals active.",
  resolved: "No alerts resolved today.",
};

const filterFooterLinks: Record<DrillDownFilter, { label: string; href: string }> = {
  at_risk:  { label: "View all client profiles →",    href: "/coach/clients" },
  critical: { label: "View full alert history →",      href: "/coach/alerts" },
  warning:  { label: "View all warning alerts →",      href: "/coach/alerts" },
  resolved: { label: "View full resolved history →",   href: "/coach/alerts" },
};

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

export function AlertDrillDownPanel({ filter, rows, onClose }: AlertDrillDownPanelProps) {
  const title = filterTitles[filter];
  const emptyMsg = filterEmptyMessages[filter];
  const footer = filterFooterLinks[filter];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-screen z-50 flex flex-col"
        style={{
          width: "340px",
          background: "#0A0A0A",
          borderLeft: "1px solid #1A1A1A",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "14px 16px", borderBottom: "1px solid #1A1A1A" }}
        >
          <h2
            className="text-[#F4EEE4] uppercase"
            style={{ fontFamily: cinzel, fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="transition-colors"
            style={{
              fontFamily: cinzel,
              fontSize: "9px",
              fontWeight: 700,
              color: "#4A3F2A",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Count subheader */}
        <div style={{ padding: "6px 16px", borderBottom: "1px solid #111111" }}>
          <p style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
            {rows.length} result{rows.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "10px 12px" }}>
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
                {emptyMsg}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {rows.map((row) => (
                <AlertDrillDownRow key={`${row.clientId}-${row.alertType}`} row={row} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0"
          style={{ padding: "10px 16px", borderTop: "1px solid #1A1A1A" }}
        >
          <a
            href={footer.href}
            className="uppercase no-underline transition-colors hover:text-[#B8933A]"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
          >
            {footer.label}
          </a>
        </div>
      </div>
    </>
  );
}
