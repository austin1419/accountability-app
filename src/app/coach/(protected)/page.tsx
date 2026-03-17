// ─────────────────────────────────────────────
// COACH DASHBOARD — War Room
//
// Server Component. Fetches all data before render.
// Uses dedicated dashboard utility, not the RPC.
// ─────────────────────────────────────────────

import { getCoachDashboardData } from "@/lib/coach/dashboard/getCoachDashboardData";
import { resolveCoachId } from "@/lib/coach/resolveCoachId";
import type { DashboardAlert, DashboardClient, PriorityItem, RecentIntervention, FollowUpDue, PillarBreakdown, DailyCompliance, CoachInsight } from "@/lib/coach/dashboard/getCoachDashboardData";

import { AmbientBar } from "@/components/coach/AmbientBar";
import { RosterScorecard } from "@/components/coach/RosterScorecard";
import { RosterHealthBar } from "@/components/coach/RosterHealthBar";

export const dynamic = "force-dynamic";

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

// ── Display helpers ──────────────────────────────────────────────

function complianceColor(pct: number | null): string {
  if (pct === null) return "#4A3F2A";
  if (pct >= 70) return "#1D9E75";
  if (pct >= 40) return "#B8933A";
  return "#7A1E1E";
}

function alertTypeLabel(alertType: string): string {
  return alertType.replace(/_/g, " ");
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const interventionLabels: Record<string, string> = {
  message_client:  "Message Client",
  adjust_habit:    "Adjust Habit",
  schedule_call:   "Schedule Call",
  review_progress: "Review Progress",
  other:           "Other",
};

// ── Page ─────────────────────────────────────────────────────────

export default async function CoachDashboardPage() {
  const coachId = await resolveCoachId();
  const dashboard = await getCoachDashboardData(coachId);
  const { clients, roster, kpis, priorityItems, attentionQueue, recentInterventions, followUpsDue, pillarBreakdown, weeklyTrend, coachInsights } = dashboard;

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="-mx-6 -mt-8 lg:-mx-8">

      {/* ── ZONE 1: Ambient Bar ──────────────────── */}
      <AmbientBar
        thriving={roster.thriving}
        atRisk={roster.atRisk}
        critical={roster.critical}
        total={roster.total}
      />

      {/* ── ZONE 2: War Room Header ──────────────── */}
      <div
        className="flex items-center justify-between"
        style={{ background: "#080808", borderBottom: "1px solid #141414", padding: "8px 20px" }}
      >
        <div className="flex items-center gap-4">
          <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#3A3020" }}>
            {todayDate}
          </p>
          <span style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.06em", color: "#4A3F2A" }}>
            {roster.total} client{roster.total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <RosterScorecard
            thriving={roster.thriving}
            atRisk={roster.atRisk}
            critical={roster.critical}
          />
          <a
            href="/coach/clients?add=true"
            className="text-[#F4EEE4] bg-[#B8933A] hover:bg-[#C9A44A] rounded-[4px] transition-colors cursor-pointer uppercase no-underline"
            style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", padding: "6px 12px" }}
          >
            + Add Client
          </a>
        </div>
      </div>

      {/* ── ZONE 3: Priority Strip ───────────────── */}
      <PriorityStripSection items={priorityItems} />

      {/* ── Page Content ─────────────────────────── */}
      <div style={{ padding: "14px 18px 18px" }}>

        {/* ── KPI Strip ──────────────────────────── */}
        <div className="grid grid-cols-5 gap-[7px] mb-5">
          <KPICard label="Clients at Risk" value={kpis.clientsAtRisk} accent={kpis.clientsAtRisk > 0 ? "crimson" : "green"} />
          <KPICard label="Critical Alerts" value={kpis.criticalAlerts} accent={kpis.criticalAlerts > 0 ? "crimson" : "green"} />
          <KPICard label="Warning Alerts" value={kpis.warningAlerts} accent={kpis.warningAlerts > 0 ? "gold" : "green"} />
          <KPICard label="Interventions Today" value={kpis.interventionsToday} accent={kpis.interventionsToday > 0 ? "gold" : "neutral"} />
          <KPICard label="Resolved Today" value={kpis.resolvedToday} accent={kpis.resolvedToday > 0 ? "green" : "neutral"} />
        </div>

        {/* ── Roster Health Bar ──────────────────── */}
        <div className="mb-5">
          <RosterHealthBar
            thriving={roster.thriving}
            atRisk={roster.atRisk}
            critical={roster.critical}
            total={roster.total}
          />
        </div>

        {/* ── Two-column: Action Surface + Analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_2fr] items-start gap-[12px]">

          {/* ── LEFT COLUMN: Action Surface ────────── */}
          <div className="flex flex-col gap-[10px]">
            <AttentionQueueSection items={attentionQueue} />
            <RecentInterventionsSection items={recentInterventions} />
            <FollowUpsDueSection items={followUpsDue} />
          </div>

          {/* ── RIGHT COLUMN: Signal Sidebar ───────── */}
          <div className="flex flex-col gap-[8px]">
            <RosterHealthSection clients={clients} />
            <PillarBreakdownSection pillars={pillarBreakdown} />
            <ComplianceTrendSection days={weeklyTrend} />
            <CoachInsightsSection insights={coachInsights} />
          </div>

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

// ── KPI Card ─────────────────────────────────────────────────────

function KPICard({ label, value, accent }: { label: string; value: number; accent: "crimson" | "gold" | "green" | "neutral" }) {
  const colors = {
    crimson: { text: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.06)", glow: "rgba(122,30,30,0.12)" },
    gold:    { text: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.05)", glow: "rgba(184,147,58,0.10)" },
    green:   { text: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.05)", glow: "rgba(29,158,117,0.10)" },
    neutral: { text: "#807868", border: "#1A1A1A", bg: "#0A0A0A", glow: "transparent" },
  }[accent];

  return (
    <div
      className="rounded-[6px] border flex flex-col items-center justify-center"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        padding: "14px 8px 10px",
        boxShadow: value > 0 ? `inset 0 1px 8px ${colors.glow}` : "none",
      }}
    >
      <span style={{ fontFamily: cinzel, fontSize: "22px", fontWeight: 900, color: colors.text, lineHeight: 1 }}>
        {value}
      </span>
      <span
        className="mt-1.5 uppercase text-center leading-tight"
        style={{ fontFamily: cinzel, fontSize: "6.5px", fontWeight: 700, letterSpacing: "0.08em", color: "#807868" }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Priority Strip ───────────────────────────────────────────────

function PriorityStripSection({ items }: { items: PriorityItem[] }) {
  if (items.length === 0) {
    return (
      <div
        className="text-center"
        style={{ background: "#060606", borderBottom: "1px solid #111111", padding: "6px 18px" }}
      >
        <p style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#0D3A25" }}>
          No priority alerts right now.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ background: "#060606", borderBottom: "1px solid #111111", padding: "6px 16px" }}
    >
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map((item, idx) => {
          const dotColor = item.alertType === "inactivity_streak" || item.alertType === "compliance_drop"
            ? "#7A1E1E"
            : "#B8933A";
          return (
            <a
              key={`${item.clientId}-${item.alertType}-${idx}`}
              href={`/coach/clients/${item.clientId}`}
              className="flex items-center gap-1.5 no-underline hover:opacity-80 transition-opacity"
            >
              <span className="flex-shrink-0 rounded-full" style={{ width: "4px", height: "4px", background: dotColor }} />
              <span style={{ fontFamily: ebGaramond, fontSize: "11px", fontWeight: 600, color: "#DDD5C0" }}>
                {item.clientName}
              </span>
              <span style={{ fontFamily: ebGaramond, fontSize: "10px", color: "#4A3F2A" }}>
                {alertTypeLabel(item.alertType)}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Attention Queue ──────────────────────────────────────────────

function AttentionQueueSection({ items }: { items: DashboardAlert[] }) {
  return (
    <Panel>
      <SectionLabel>Attention Queue</SectionLabel>
      {items.length === 0 ? (
        <EmptyState message="No clients need attention right now." accent="green" />
      ) : (
        <div className="flex flex-col gap-[6px] mt-2.5">
          {items.map((item, idx) => (
            <AttentionRow key={`${item.clientId}-${item.alertType}-${idx}`} alert={item} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function AttentionRow({ alert }: { alert: DashboardAlert }) {
  const typeLabel = alertTypeLabel(alert.alertType);
  const statusColor = alert.statusLabel === "gone_dark" ? "#2A2010"
    : alert.statusLabel === "critical" ? "#7A1E1E"
    : "#B8933A";

  return (
    <div
      className="rounded-[5px] border border-[#151515] transition-colors hover:border-[#1E1E1E]"
      style={{ background: "#0A0A0A", borderLeft: `4px solid ${statusColor}`, padding: "10px 12px" }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="truncate" style={{ fontFamily: ebGaramond, fontSize: "13.5px", fontWeight: 600, color: "#DDD5C0" }}>
          {alert.clientName}
        </span>
        <a
          href={`/coach/clients/${alert.clientId}`}
          className="uppercase no-underline flex-shrink-0 rounded-[3px] border transition-colors hover:text-[#B8933A] hover:border-[#B8933A]"
          style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.06em", color: "#F4EEE4", borderColor: "#1A1A1A", padding: "3px 8px" }}
        >
          Open &rarr;
        </a>
      </div>

      {alert.goalName && (
        <p className="truncate mb-1.5" style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
          {alert.goalName}
          {alert.goalCategory && <span> · {alert.goalCategory}</span>}
        </p>
      )}

      <div className="flex items-center gap-2 mb-1.5">
        <ComplianceChip label="T" pct={alert.todayPct} />
        <ComplianceChip label="7d" pct={alert.sevenDayPct} />
        <ComplianceChip label="30d" pct={alert.thirtyDayPct} />
        {alert.daysSinceActive !== null && alert.daysSinceActive >= 3 && (
          <span style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, color: "#7A1E1E", letterSpacing: "0.04em" }}>
            {alert.daysSinceActive}d inactive
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-0.5">
        <span
          className="rounded-[3px] border uppercase"
          style={{
            fontFamily: cinzel, fontSize: "6.5px", fontWeight: 700, letterSpacing: "0.06em",
            color: statusColor, borderColor: statusColor, padding: "2px 6px",
          }}
        >
          {typeLabel}
        </span>
        <span className="uppercase" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#3A3020" }}>
          {alert.status.replace(/_/g, " ")}
        </span>
      </div>

      {alert.interventionNote && (
        <p className="mt-1.5 truncate" style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
          {alert.interventionNote}
        </p>
      )}
    </div>
  );
}

function ComplianceChip({ label, pct }: { label: string; pct: number | null }) {
  const display = pct !== null ? `${pct}%` : "—";
  return (
    <span
      className="rounded-[3px]"
      style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, color: complianceColor(pct), letterSpacing: "0.02em", background: "#0D0D0D", padding: "2px 5px" }}
    >
      {label}:{display}
    </span>
  );
}

// ── Recent Interventions ─────────────────────────────────────────

function RecentInterventionsSection({ items }: { items: RecentIntervention[] }) {
  return (
    <Panel>
      <SectionLabel>Recent Interventions</SectionLabel>
      {items.length === 0 ? (
        <EmptyState message="No interventions recorded today." />
      ) : (
        <div className="flex flex-col gap-[5px] mt-2.5">
          {items.map((item, idx) => (
            <a
              key={`${item.clientId}-${idx}`}
              href={`/coach/clients/${item.clientId}`}
              className="rounded-[5px] border border-[#151515] no-underline transition-colors hover:border-[#1E1E1E]"
              style={{ background: "#0A0A0A", borderLeft: "3px solid #B8933A", padding: "8px 11px" }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="truncate" style={{ fontFamily: ebGaramond, fontSize: "12px", fontWeight: 600, color: "#DDD5C0" }}>
                  {item.clientName}
                </span>
                <span style={{ fontFamily: ebGaramond, fontSize: "9px", color: "#3A3020" }}>
                  {relativeTime(item.updatedAt)}
                </span>
              </div>
              <span
                className="uppercase block mb-0.5"
                style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#B8933A" }}
              >
                {interventionLabels[item.interventionType] ?? item.interventionType}
              </span>
              <p className="truncate" style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#807868" }}>
                {item.interventionNote}
              </p>
            </a>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── Follow-Ups Due ───────────────────────────────────────────────

function FollowUpsDueSection({ items }: { items: FollowUpDue[] }) {
  return (
    <Panel>
      <SectionLabel>Follow-Ups Due</SectionLabel>
      {items.length === 0 ? (
        <EmptyState message="No follow-ups due in the next 24 hours." />
      ) : (
        <div className="flex flex-col gap-[5px] mt-2.5">
          {items.map((item, idx) => {
            const fuDate = new Date(item.followUpDate);
            const isOverdue = fuDate.getTime() < Date.now();
            const dateLabel = fuDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timeLabel = fuDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            return (
              <a
                key={`${item.clientId}-${idx}`}
                href={`/coach/clients/${item.clientId}`}
                className="rounded-[5px] border border-[#151515] no-underline transition-colors hover:border-[#1E1E1E]"
                style={{
                  background: "#0A0A0A",
                  borderLeft: `3px solid ${isOverdue ? "#7A1E1E" : "#B8933A"}`,
                  padding: "8px 11px",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="truncate" style={{ fontFamily: ebGaramond, fontSize: "12px", fontWeight: 600, color: "#DDD5C0" }}>
                    {item.clientName}
                  </span>
                  <span style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, color: isOverdue ? "#7A1E1E" : "#B8933A" }}>
                    {isOverdue ? "OVERDUE" : `${dateLabel} ${timeLabel}`}
                  </span>
                </div>
                <span
                  className="uppercase block mb-0.5"
                  style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#3A3020" }}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
                {item.coachNote && (
                  <p className="truncate" style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#807868" }}>
                    {item.coachNote}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ── Roster Health ─────────────────────────────────────────────────

const INITIAL_VISIBLE = 8;

function RosterHealthSection({ clients }: { clients: DashboardClient[] }) {
  const sorted = [...clients].sort((a, b) => {
    const gdA = a.statusLabel === "gone_dark" ? 0 : 1;
    const gdB = b.statusLabel === "gone_dark" ? 0 : 1;
    if (gdA !== gdB) return gdA - gdB;
    return (a.thirtyDayPct ?? 0) - (b.thirtyDayPct ?? 0);
  });

  const visible = sorted.slice(0, INITIAL_VISIBLE);
  const remaining = sorted.length - INITIAL_VISIBLE;

  const statusDot: Record<string, string> = {
    thriving: "#1D9E75", at_risk: "#B8933A", critical: "#7A1E1E", gone_dark: "#2A2010",
  };

  return (
    <Panel>
      <SectionLabel>Roster Health</SectionLabel>
      {sorted.length === 0 ? (
        <EmptyState message="No clients in roster." />
      ) : (
        <div className="flex flex-col gap-[4px] mt-2.5">
          {visible.map((c) => {
            const pct = c.thirtyDayPct ?? 0;
            const barColor = complianceColor(c.thirtyDayPct);
            return (
              <a
                key={c.id}
                href={`/coach/clients/${c.id}`}
                className="flex items-center gap-2 no-underline rounded-[3px] hover:bg-[rgba(255,255,255,0.015)] transition-colors"
                style={{ padding: "2.5px 3px" }}
              >
                <span className="flex-shrink-0 rounded-full" style={{ width: "4px", height: "4px", background: statusDot[c.statusLabel] ?? "#4A3F2A" }} />
                <span className="truncate" style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#DDD5C0", minWidth: "55px", maxWidth: "95px" }}>
                  {c.name}
                </span>
                <div className="flex-1 h-[3px] bg-[#141414] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                </div>
                <span className="flex-shrink-0 text-right" style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, color: barColor, minWidth: "26px" }}>
                  {c.thirtyDayPct !== null ? `${c.thirtyDayPct}%` : "—"}
                </span>
              </a>
            );
          })}
          {remaining > 0 && (
            <a
              href="/coach/clients"
              className="no-underline text-center mt-0.5 transition-colors hover:text-[#B8933A]"
              style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.06em", color: "#3A3020" }}
            >
              + {remaining} more →
            </a>
          )}
        </div>
      )}
    </Panel>
  );
}

// ── Pillar Breakdown ─────────────────────────────────────────────

function PillarBreakdownSection({ pillars }: { pillars: PillarBreakdown[] }) {
  return (
    <Panel>
      <SectionLabel>Pillar Breakdown</SectionLabel>
      <div className="grid grid-cols-4 gap-[6px] mt-2.5">
        {pillars.map((p) => {
          const pct = p.avgPct;
          const hasData = pct !== null && p.taskCount > 0;
          const color = hasData ? complianceColor(pct) : "#3A3020";
          const borderColor = hasData
            ? (pct! >= 70 ? "#0D3A25" : pct! >= 40 ? "#2A2010" : "#2A1010")
            : "#151515";
          const bgColor = hasData
            ? (pct! >= 70 ? "rgba(29,158,117,0.05)" : pct! >= 40 ? "rgba(184,147,58,0.05)" : "rgba(122,30,30,0.06)")
            : "#0A0A0A";

          return (
            <div
              key={p.pillar}
              className="rounded-[5px] border flex flex-col items-center justify-center"
              style={{ background: bgColor, borderColor, padding: "10px 4px 8px" }}
            >
              <span style={{ fontFamily: cinzel, fontSize: "16px", fontWeight: 900, color, lineHeight: 1 }}>
                {hasData ? `${pct}%` : "—"}
              </span>
              <span
                className="mt-1 uppercase"
                style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#807868" }}
              >
                {p.label}
              </span>
              {hasData && (
                <div className="w-full h-[3px] bg-[#141414] rounded-full mt-1.5 overflow-hidden" style={{ margin: "0 4px" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct!, 100)}%`, background: color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Compliance Trend ─────────────────────────────────────────────

function ComplianceTrendSection({ days }: { days: DailyCompliance[] }) {
  return (
    <Panel>
      <SectionLabel>Compliance Trend</SectionLabel>
      <div className="grid grid-cols-7 gap-[3px] mt-2.5">
        {days.map((d) => {
          const pct = d.avgPct;
          const hasData = pct !== null;
          const bgColor = !hasData ? "#0A0A0A"
            : pct >= 70 ? "rgba(29,158,117,0.10)"
            : pct >= 40 ? "rgba(184,147,58,0.10)"
            : "rgba(122,30,30,0.10)";
          const textColor = !hasData ? "#3A3020" : complianceColor(pct);

          return (
            <div
              key={d.date}
              className="rounded-[4px] flex flex-col items-center justify-center"
              style={{ background: bgColor, padding: "7px 2px" }}
            >
              <span style={{ fontFamily: cinzel, fontSize: "5.5px", fontWeight: 700, letterSpacing: "0.04em", color: "#807868" }}>
                {d.dayLabel}
              </span>
              <span className="mt-0.5" style={{ fontFamily: cinzel, fontSize: "13px", fontWeight: 900, color: textColor, lineHeight: 1 }}>
                {hasData ? pct : "—"}
              </span>
              {hasData && (
                <span style={{ fontFamily: cinzel, fontSize: "5px", color: "#3A3020", marginTop: "1px" }}>%</span>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Coach Insights ───────────────────────────────────────────────

function CoachInsightsSection({ insights }: { insights: CoachInsight[] }) {
  const dotColors: Record<string, string> = { green: "#1D9E75", gold: "#B8933A", crimson: "#7A1E1E" };

  return (
    <Panel>
      <SectionLabel>Coach Insights</SectionLabel>
      {insights.length === 0 ? (
        <EmptyState message="No insights to display." />
      ) : (
        <div className="flex flex-col gap-1.5 mt-2.5">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-[4px] border border-[#151515]"
              style={{ background: "#0A0A0A", padding: "7px 10px" }}
            >
              <span
                className="flex-shrink-0 rounded-full mt-1"
                style={{ width: "4px", height: "4px", background: dotColors[insight.dot] ?? "#807868" }}
              />
              <p style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#DDD5C0", lineHeight: 1.5 }}>
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── Shared Presentation Helpers ──────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[6px] border border-[#151515]"
      style={{ background: "#0D0D0D", padding: "14px 16px" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.10em", color: "#807868" }}
    >
      {children}
    </p>
  );
}

function EmptyState({ message, accent = "default" }: { message: string; accent?: "green" | "default" }) {
  const textColor = accent === "green" ? "#1D9E75" : "#3A3020";
  const borderColor = accent === "green" ? "#0A2A1A" : "#141414";
  return (
    <div
      className="rounded-[4px] border text-center mt-2.5"
      style={{ borderColor, padding: "16px 12px", background: accent === "green" ? "rgba(29,158,117,0.02)" : "#090909" }}
    >
      <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: textColor }}>
        {message}
      </p>
    </div>
  );
}
