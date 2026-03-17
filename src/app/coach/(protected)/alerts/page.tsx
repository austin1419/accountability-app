// ─────────────────────────────────────────────
// COACH ALERTS — Client Risk Board
//
// Groups alerts by client, rendering one card per
// client instead of one card per alert. Prevents
// card explosion at scale. Each alert row within
// a card is individually actionable.
//
// Pure display layer — grouping and sorting are
// visual operations only.
// ─────────────────────────────────────────────

import { getCoachAnalytics } from "@/lib/coach/analytics/getCoachAnalytics";
import type { HydratedAlert } from "@/lib/coach/analytics/getCoachAnalytics";
import { resolveCoachId } from "@/lib/coach/resolveCoachId";

import { ClientRiskCard } from "@/components/coach/alerts/ClientRiskCard";
import type { ClientAlert } from "@/components/coach/alerts/ClientRiskCard";
import { AlertTilesWithPanel } from "@/components/coach/alerts/AlertTilesWithPanel";
import type { DrillDownFilter } from "@/components/coach/alerts/AlertDrillDownPanel";
import type { DrillDownRowData } from "@/components/coach/alerts/AlertDrillDownRow";
import { CoachInsightPanel } from "@/components/coach/analytics/CoachInsightPanel";

export const dynamic = "force-dynamic";

// Coach ID resolved from auth at render time

// ── Display helpers ──────────────────────────────────────────────

function alertSeverity(priority: number): "critical" | "warning" {
  return priority <= 1 ? "critical" : "warning";
}

function isResolvedToday(alert: HydratedAlert): boolean {
  if (alert.status !== "resolved" || !alert.resolved_at) return false;
  const resolved = new Date(alert.resolved_at);
  const now = new Date();
  return (
    resolved.getFullYear() === now.getFullYear() &&
    resolved.getMonth() === now.getMonth() &&
    resolved.getDate() === now.getDate()
  );
}

function toClientAlert(alert: HydratedAlert): ClientAlert {
  return {
    alertType: alert.alert_type,
    severity: alertSeverity(alert.alert_priority),
    priority: alert.alert_priority,
    message: alert.alert_message,
    detailValue: alert.detail_value,
    status: alert.status,
    reviewedAt: alert.reviewed_at,
    resolvedAt: alert.resolved_at,
    coachNote: alert.coach_note,
    interventionType: alert.intervention_type,
    interventionNote: alert.intervention_note,
    followUpDate: alert.follow_up_date,
  };
}

interface ClientGroup {
  clientId: string;
  clientName: string;
  activeAlerts: ClientAlert[];
  resolvedTodayAlerts: ClientAlert[];
  /** For sorting: count of critical active alerts */
  criticalCount: number;
  /** For sorting: count of warning active alerts */
  warningCount: number;
  /** For sorting: most recent alert timestamp */
  latestTimestamp: number;
}

function groupAlertsByClient(alerts: HydratedAlert[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();

  for (const alert of alerts) {
    let group = map.get(alert.client_id);
    if (!group) {
      group = {
        clientId: alert.client_id,
        clientName: alert.client_name,
        activeAlerts: [],
        resolvedTodayAlerts: [],
        criticalCount: 0,
        warningCount: 0,
        latestTimestamp: 0,
      };
      map.set(alert.client_id, group);
    }

    const ca = toClientAlert(alert);

    if (alert.status === "resolved") {
      if (isResolvedToday(alert)) {
        group.resolvedTodayAlerts.push(ca);
      }
      // Resolved alerts not from today are excluded from the board
    } else {
      group.activeAlerts.push(ca);
      if (alert.alert_priority <= 1) group.criticalCount++;
      else group.warningCount++;
    }

    // Track most recent timestamp for sorting
    const ts = new Date(alert.reviewed_at ?? alert.resolved_at ?? "1970-01-01").getTime();
    if (ts > group.latestTimestamp) group.latestTimestamp = ts;
  }

  // Sort active alerts within each group: critical first, then by priority
  for (const group of map.values()) {
    group.activeAlerts.sort((a, b) => a.priority - b.priority);
  }

  // Convert to array, filter out groups with nothing to show
  const groups = Array.from(map.values()).filter(
    (g) => g.activeAlerts.length > 0 || g.resolvedTodayAlerts.length > 0,
  );

  // Sort groups: most critical first, then by warning count, then by recency
  groups.sort((a, b) => {
    if (a.criticalCount !== b.criticalCount) return b.criticalCount - a.criticalCount;
    if (a.warningCount !== b.warningCount) return b.warningCount - a.warningCount;
    return b.latestTimestamp - a.latestTimestamp;
  });

  return groups;
}

// ── Page ─────────────────────────────────────────────────────────

export default async function CoachAlertsPage() {
  const coachId = await resolveCoachId();
  const analytics = await getCoachAnalytics(coachId);
  const { alerts, insights } = analytics;

  const clientGroups = groupAlertsByClient(alerts);

  // Aggregate counts for summary
  const totalActive = alerts.filter((a) => a.status !== "resolved").length;
  const criticalCount = alerts.filter((a) => a.status !== "resolved" && a.alert_priority <= 1).length;
  const warningCount = alerts.filter((a) => a.status !== "resolved" && a.alert_priority > 1 && a.status !== "intervention" && a.status !== "action_taken").length;
  const interventionCount = alerts.filter((a) => a.status === "intervention" || a.status === "action_taken").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;
  // Count unique clients with active (non-resolved) alerts — must match visible cards
  const clientsWithActiveAlerts = new Set(
    alerts.filter((a) => a.status !== "resolved").map((a) => a.client_id),
  ).size;

  // Build drill-down row data for each filter (server-side, passed to client wrapper)
  function toRow(a: HydratedAlert): DrillDownRowData {
    return {
      clientId: a.client_id,
      clientName: a.client_name,
      alertType: a.alert_type,
      severity: alertSeverity(a.alert_priority),
      message: a.alert_message,
      status: a.status,
      updatedAt: a.reviewed_at ?? a.resolved_at ?? null,
    };
  }

  const activeAlerts = alerts.filter((a) => a.status !== "resolved");
  const resolvedTodayAlerts = alerts.filter((a) => isResolvedToday(a));

  // Sort: critical first, unactioned first, newest first
  function triageSort(rows: DrillDownRowData[]): DrillDownRowData[] {
    const statusOrder: Record<string, number> = { new: 0, reviewed: 1, action_taken: 2, intervention: 3, resolved: 4 };
    return [...rows].sort((a, b) => {
      const sevA = a.severity === "critical" ? 0 : 1;
      const sevB = b.severity === "critical" ? 0 : 1;
      if (sevA !== sevB) return sevA - sevB;
      const stA = statusOrder[a.status] ?? 9;
      const stB = statusOrder[b.status] ?? 9;
      if (stA !== stB) return stA - stB;
      return new Date(b.updatedAt ?? "1970").getTime() - new Date(a.updatedAt ?? "1970").getTime();
    });
  }

  const interventionAlerts = alerts.filter((a) => a.status === "intervention" || a.status === "action_taken");

  const rowsByFilter: Record<DrillDownFilter, DrillDownRowData[]> = {
    at_risk:      triageSort(activeAlerts.map(toRow)),
    critical:     triageSort(activeAlerts.filter((a) => a.alert_priority <= 1).map(toRow)),
    warning:      triageSort(activeAlerts.filter((a) => a.alert_priority > 1 && a.status !== "intervention" && a.status !== "action_taken").map(toRow)),
    intervention: triageSort(interventionAlerts.map(toRow)),
    resolved:     resolvedTodayAlerts.map(toRow),
  };

  const tiles = [
    { filter: "at_risk" as DrillDownFilter,      label: "Clients at Risk", count: clientsWithActiveAlerts,     accent: (clientsWithActiveAlerts > 0 ? "crimson" : "green") as "crimson" | "green" },
    { filter: "critical" as DrillDownFilter,     label: "Critical",         count: criticalCount,      accent: (criticalCount > 0 ? "crimson" : "green") as "crimson" | "green", subtext: "Priority 1" },
    { filter: "warning" as DrillDownFilter,      label: "Warning",          count: warningCount,       accent: (warningCount > 0 ? "gold" : "green") as "gold" | "green",      subtext: "Priority 2+" },
    { filter: "intervention" as DrillDownFilter, label: "Intervention",     count: interventionCount,  accent: (interventionCount > 0 ? "gold" : "neutral") as "gold" | "neutral" },
    { filter: "resolved" as DrillDownFilter,     label: "Resolved",         count: resolvedCount,      accent: (resolvedCount > 0 ? "green" : "neutral") as "green" | "neutral" },
  ];

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="-mx-6 -mt-8 lg:-mx-8">

      {/* ── Date subheader ─────────────────────────── */}
      <div
        className="border-b border-[#1A1A1A]"
        style={{ background: "#0A0A0A", padding: "6px 18px" }}
      >
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          {todayDate} — {clientsWithActiveAlerts} client{clientsWithActiveAlerts !== 1 ? "s" : ""} at risk · {totalActive} active signal{totalActive !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Page content ──────────────────────────── */}
      <div style={{ padding: "18px" }}>

        {/* ── Summary Tiles (clickable → drill-down panel) ── */}
        <AlertTilesWithPanel tiles={tiles} rowsByFilter={rowsByFilter} />

        {/* ── Client Risk Board ───────────────────── */}
        {clientGroups.length === 0 ? (
          <EmptySection message="No active alerts. All clients above threshold." accent="green" />
        ) : (
          <div className="space-y-4 mb-6">
            {/* Critical clients (have at least one priority-1 alert) */}
            {clientGroups.filter((g) => g.criticalCount > 0).length > 0 && (
              <>
                <SeverityHeader label="Critical" count={clientGroups.filter((g) => g.criticalCount > 0).length} color="#7A1E1E" />
                <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-[9px]">
                  {clientGroups.filter((g) => g.criticalCount > 0).map((group) => (
                    <ClientRiskCard
                      key={group.clientId}
                      clientId={group.clientId}
                      clientName={group.clientName}
                      activeAlerts={group.activeAlerts}
                      resolvedTodayAlerts={group.resolvedTodayAlerts}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Warning clients (no critical, but have warnings) */}
            {clientGroups.filter((g) => g.criticalCount === 0 && g.warningCount > 0).length > 0 && (
              <>
                <SeverityHeader label="Warning" count={clientGroups.filter((g) => g.criticalCount === 0 && g.warningCount > 0).length} color="#B8933A" />
                <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-[9px]">
                  {clientGroups.filter((g) => g.criticalCount === 0 && g.warningCount > 0).map((group) => (
                    <ClientRiskCard
                      key={group.clientId}
                      clientId={group.clientId}
                      clientName={group.clientName}
                      activeAlerts={group.activeAlerts}
                      resolvedTodayAlerts={group.resolvedTodayAlerts}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Resolved-only clients (no active, only resolved today) */}
            {clientGroups.filter((g) => g.activeAlerts.length === 0 && g.resolvedTodayAlerts.length > 0).length > 0 && (
              <>
                <SeverityHeader label="Resolved Today" count={clientGroups.filter((g) => g.activeAlerts.length === 0).length} color="#1D9E75" />
                <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-[9px]">
                  {clientGroups.filter((g) => g.activeAlerts.length === 0 && g.resolvedTodayAlerts.length > 0).map((group) => (
                    <ClientRiskCard
                      key={group.clientId}
                      clientId={group.clientId}
                      clientName={group.clientName}
                      activeAlerts={group.activeAlerts}
                      resolvedTodayAlerts={group.resolvedTodayAlerts}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Roster Insights ─────────────────────── */}
        <CoachInsightPanel insights={insights} />

      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SeverityHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="rounded-full" style={{ width: "6px", height: "6px", background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "#4A3F2A" }}>
        {count} client{count !== 1 ? "s" : ""}
      </span>
      <div className="flex-1 h-px" style={{ background: "#1A1A1A" }} />
    </div>
  );
}

function EmptySection({ message, accent = "default" }: { message: string; accent?: "green" | "default" }) {
  const borderClass = accent === "green" ? "border-[#0D3A25]" : "border-[#1A1A1A]";
  const textColor = accent === "green" ? "#1D9E75" : "#4A3F2A";
  return (
    <div className={`bg-[#0D0D0D] rounded-[7px] border ${borderClass} py-5 px-4 text-center mb-6`}>
      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: textColor }}>
        {message}
      </p>
    </div>
  );
}
