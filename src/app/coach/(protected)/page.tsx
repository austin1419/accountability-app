// ─────────────────────────────────────────────
// COACH DASHBOARD — V1 (Phase 1-3)
//
// Server Component. Fetches all data before render.
// Uses dedicated dashboard utility, not the RPC.
//
// Phase 1/2: Ambient Bar, RosterScorecard, KPI Strip, Roster Health Bar
// Phase 3: Priority Strip, Attention Queue, Recent Interventions, Follow-Ups Due
// ─────────────────────────────────────────────

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoachDashboardData } from "@/lib/coach/dashboard/getCoachDashboardData";
import type { DashboardAlert, DashboardClient, PriorityItem, RecentIntervention, FollowUpDue, PillarBreakdown, DailyCompliance, CoachInsight } from "@/lib/coach/dashboard/getCoachDashboardData";

import { AmbientBar } from "@/components/coach/AmbientBar";
import { RosterScorecard } from "@/components/coach/RosterScorecard";
import { RosterHealthBar } from "@/components/coach/RosterHealthBar";

export const dynamic = "force-dynamic";

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

// ── Resolve coach ID (same auth pattern as existing pages) ───────

async function resolveCoachId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/coach/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "coach")
    .maybeSingle();

  if (!data) redirect("/login");
  return data.id;
}

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

      {/* ── ZONE 2: Action Bar ───────────────────── */}
      <div
        className="flex items-center justify-between border-b border-[#1A1A1A]"
        style={{ background: "#0A0A0A", padding: "6px 18px" }}
      >
        <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          {todayDate} — {roster.total} active client{roster.total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3">
          <RosterScorecard
            thriving={roster.thriving}
            atRisk={roster.atRisk}
            critical={roster.critical}
          />
          <a
            href="/coach/clients?add=true"
            className="text-[#F4EEE4] bg-[#B8933A] hover:bg-[#C9A44A] rounded-[5px] transition-colors cursor-pointer uppercase no-underline"
            style={{ fontFamily: cinzel, fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", padding: "7px 14px" }}
          >
            + Add Client
          </a>
        </div>
      </div>

      {/* ── Page Content ─────────────────────────── */}
      <div style={{ padding: "18px" }}>

        {/* ── KPI Strip ──────────────────────────── */}
        <div className="grid grid-cols-5 gap-[9px] mb-6">
          <KPICard label="Clients at Risk" value={kpis.clientsAtRisk} accent={kpis.clientsAtRisk > 0 ? "crimson" : "green"} />
          <KPICard label="Critical Alerts" value={kpis.criticalAlerts} accent={kpis.criticalAlerts > 0 ? "crimson" : "green"} />
          <KPICard label="Warning Alerts" value={kpis.warningAlerts} accent={kpis.warningAlerts > 0 ? "gold" : "green"} />
          <KPICard label="Interventions Today" value={kpis.interventionsToday} accent={kpis.interventionsToday > 0 ? "gold" : "neutral"} />
          <KPICard label="Resolved Today" value={kpis.resolvedToday} accent={kpis.resolvedToday > 0 ? "green" : "neutral"} />
        </div>

        {/* ── Roster Health Bar ──────────────────── */}
        <div className="mb-6">
          <RosterHealthBar
            thriving={roster.thriving}
            atRisk={roster.atRisk}
            critical={roster.critical}
            total={roster.total}
          />
        </div>

        {/* ── Priority Strip ─────────────────────── */}
        <PriorityStripSection items={priorityItems} />

        {/* ── Two-column: Attention Queue + Recent Interventions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-[9px] mb-4">
          <AttentionQueueSection items={attentionQueue} />
          <RecentInterventionsSection items={recentInterventions} />
        </div>

        {/* ── Two-column: Follow-Ups Due + Roster Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-[9px] mb-4">
          <FollowUpsDueSection items={followUpsDue} />
          <RosterHealthSection clients={clients} />
        </div>

        {/* ── Two-column: Pillar Breakdown + Compliance Trend ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-[9px] mb-4">
          <PillarBreakdownSection pillars={pillarBreakdown} />
          <ComplianceTrendSection days={weeklyTrend} />
        </div>

        {/* ── Coach Insights ─────────────────────── */}
        <CoachInsightsSection insights={coachInsights} />

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
    crimson: { text: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.10)" },
    gold:    { text: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.08)" },
    green:   { text: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.08)" },
    neutral: { text: "#807868", border: "#1A1A1A", bg: "#0D0D0D" },
  }[accent];

  return (
    <div
      className="rounded-[7px] border flex flex-col items-center justify-center"
      style={{ background: colors.bg, borderColor: colors.border, padding: "12px 10px" }}
    >
      <span style={{ fontFamily: cinzel, fontSize: "20px", fontWeight: 900, color: colors.text, lineHeight: 1 }}>
        {value}
      </span>
      <span
        className="mt-1 uppercase text-center"
        style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#807868" }}
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
        className="rounded-[5px] border border-[#0D3A25] mb-4 text-center"
        style={{ background: "#060606", padding: "8px 18px" }}
      >
        <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#1D9E75" }}>
          No priority alerts right now.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[5px] border border-[#1A1A1A] mb-4"
      style={{ background: "#060606", padding: "8px 14px" }}
    >
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {items.map((item, idx) => {
          const dotColor = item.alertType === "inactivity_streak" || item.alertType === "compliance_drop"
            ? "#7A1E1E"
            : "#B8933A";
          return (
            <a
              key={`${item.clientId}-${item.alertType}-${idx}`}
              href={`/coach/clients/${item.clientId}`}
              className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity"
            >
              <span className="flex-shrink-0 rounded-full" style={{ width: "5px", height: "5px", background: dotColor }} />
              <span style={{ fontFamily: ebGaramond, fontSize: "11px", fontWeight: 600, color: "#DDD5C0" }}>
                {item.clientName}
              </span>
              <span style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#807868" }}>
                — {alertTypeLabel(item.alertType)}
              </span>
              {item.coachNote && (
                <span style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
                  ({item.coachNote.length > 30 ? item.coachNote.slice(0, 30) + "…" : item.coachNote})
                </span>
              )}
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
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
      style={{ padding: "16px 20px" }}
    >
      <SectionLabel>Attention Queue</SectionLabel>

      {items.length === 0 ? (
        <EmptyState message="No clients need attention right now." accent="green" />
      ) : (
        <div className="flex flex-col gap-[7px] mt-3">
          {items.map((item, idx) => (
            <AttentionRow key={`${item.clientId}-${item.alertType}-${idx}`} alert={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionRow({ alert }: { alert: DashboardAlert }) {
  const typeLabel = alertTypeLabel(alert.alertType);
  const statusColor = alert.statusLabel === "gone_dark" ? "#2A2010"
    : alert.statusLabel === "critical" ? "#7A1E1E"
    : "#B8933A";

  return (
    <div
      className="rounded-[5px] border border-[#1A1A1A]"
      style={{ background: "#111111", borderLeft: `3px solid ${statusColor}`, padding: "8px 10px" }}
    >
      {/* Row 1: Name + goal */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="truncate" style={{ fontFamily: ebGaramond, fontSize: "13px", fontWeight: 600, color: "#DDD5C0" }}>
          {alert.clientName}
        </span>
        <a
          href={`/coach/clients/${alert.clientId}`}
          className="uppercase no-underline flex-shrink-0 transition-colors hover:text-[#B8933A]"
          style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.06em", color: "#F4EEE4" }}
        >
          Open Client &rarr;
        </a>
      </div>

      {/* Row 2: Goal + category */}
      {alert.goalName && (
        <p className="truncate mb-1" style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#807868" }}>
          {alert.goalName}
          {alert.goalCategory && (
            <span style={{ color: "#4A3F2A" }}> · {alert.goalCategory}</span>
          )}
        </p>
      )}

      {/* Row 3: Compliance + alert */}
      <div className="flex items-center gap-3 mb-0.5">
        <ComplianceChip label="T" pct={alert.todayPct} />
        <ComplianceChip label="7d" pct={alert.sevenDayPct} />
        <ComplianceChip label="30d" pct={alert.thirtyDayPct} />
        {alert.daysSinceActive !== null && alert.daysSinceActive >= 3 && (
          <span style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, color: "#7A1E1E" }}>
            {alert.daysSinceActive}d inactive
          </span>
        )}
      </div>

      {/* Row 4: Alert label */}
      <div className="flex items-center gap-2 mt-1">
        <span
          className="rounded border uppercase"
          style={{
            fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em",
            color: statusColor, borderColor: statusColor, padding: "1px 5px",
          }}
        >
          {typeLabel}
        </span>
        <span style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#4A3F2A" }}>
          {alert.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Intervention note if present */}
      {alert.interventionNote && (
        <p className="mt-1 truncate" style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
          Note: {alert.interventionNote}
        </p>
      )}
    </div>
  );
}

function ComplianceChip({ label, pct }: { label: string; pct: number | null }) {
  const display = pct !== null ? `${pct}%` : "—";
  return (
    <span style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, color: complianceColor(pct) }}>
      {label}: {display}
    </span>
  );
}

// ── Recent Interventions ─────────────────────────────────────────

function RecentInterventionsSection({ items }: { items: RecentIntervention[] }) {
  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
      style={{ padding: "16px 20px" }}
    >
      <SectionLabel>Recent Interventions</SectionLabel>

      {items.length === 0 ? (
        <EmptyState message="No interventions recorded today." />
      ) : (
        <div className="flex flex-col gap-[6px] mt-3">
          {items.map((item, idx) => (
            <a
              key={`${item.clientId}-${idx}`}
              href={`/coach/clients/${item.clientId}`}
              className="rounded-[5px] border border-[#1A1A1A] no-underline transition-colors hover:border-[#2A2010]"
              style={{ background: "#111111", borderLeft: "3px solid #B8933A", padding: "7px 10px" }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="truncate" style={{ fontFamily: ebGaramond, fontSize: "12px", fontWeight: 600, color: "#DDD5C0" }}>
                  {item.clientName}
                </span>
                <span style={{ fontFamily: ebGaramond, fontSize: "9px", color: "#4A3F2A" }}>
                  {relativeTime(item.updatedAt)}
                </span>
              </div>
              <span
                className="uppercase block mb-0.5"
                style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#B8933A" }}
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
    </div>
  );
}

// ── Follow-Ups Due ───────────────────────────────────────────────

function FollowUpsDueSection({ items }: { items: FollowUpDue[] }) {
  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
      style={{ padding: "16px 20px" }}
    >
      <SectionLabel>Follow-Ups Due</SectionLabel>

      {items.length === 0 ? (
        <EmptyState message="No follow-ups due in the next 24 hours." />
      ) : (
        <div className="flex flex-col gap-[6px] mt-3">
          {items.map((item, idx) => {
            const fuDate = new Date(item.followUpDate);
            const isOverdue = fuDate.getTime() < Date.now();
            const dateLabel = fuDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timeLabel = fuDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            return (
              <a
                key={`${item.clientId}-${idx}`}
                href={`/coach/clients/${item.clientId}`}
                className="rounded-[5px] border border-[#1A1A1A] no-underline transition-colors hover:border-[#2A2010]"
                style={{
                  background: "#111111",
                  borderLeft: `3px solid ${isOverdue ? "#7A1E1E" : "#B8933A"}`,
                  padding: "7px 10px",
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
                  style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#4A3F2A" }}
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
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[#807868] uppercase"
      style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em" }}
    >
      {children}
    </p>
  );
}

function EmptyState({ message, accent = "default" }: { message: string; accent?: "green" | "default" }) {
  const textColor = accent === "green" ? "#1D9E75" : "#4A3F2A";
  return (
    <div className="py-5 text-center">
      <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: textColor }}>
        {message}
      </p>
    </div>
  );
}

// ── Roster Health ─────────────────────────────────────────────────

const INITIAL_VISIBLE = 8;

function RosterHealthSection({ clients }: { clients: DashboardClient[] }) {
  // Sort: gone_dark first, then lowest thirty_day_pct
  const sorted = [...clients].sort((a, b) => {
    const gdA = a.statusLabel === "gone_dark" ? 0 : 1;
    const gdB = b.statusLabel === "gone_dark" ? 0 : 1;
    if (gdA !== gdB) return gdA - gdB;
    return (a.thirtyDayPct ?? 0) - (b.thirtyDayPct ?? 0);
  });

  const visible = sorted.slice(0, INITIAL_VISIBLE);
  const remaining = sorted.length - INITIAL_VISIBLE;

  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
      style={{ padding: "16px 20px" }}
    >
      <SectionLabel>Roster Health</SectionLabel>

      {sorted.length === 0 ? (
        <EmptyState message="No clients in roster." />
      ) : (
        <div className="flex flex-col gap-[5px] mt-3">
          {visible.map((c) => {
            const pct = c.thirtyDayPct ?? 0;
            const barColor = complianceColor(c.thirtyDayPct);
            const statusColors: Record<string, string> = {
              thriving: "#1D9E75", at_risk: "#B8933A", critical: "#7A1E1E", gone_dark: "#2A2010",
            };
            return (
              <a
                key={c.id}
                href={`/coach/clients/${c.id}`}
                className="flex items-center gap-2.5 no-underline rounded-[4px] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                style={{ padding: "3px 4px" }}
              >
                {/* Status dot */}
                <span
                  className="flex-shrink-0 rounded-full"
                  style={{ width: "5px", height: "5px", background: statusColors[c.statusLabel] ?? "#4A3F2A" }}
                />
                {/* Name */}
                <span
                  className="truncate"
                  style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#DDD5C0", minWidth: "60px", maxWidth: "100px" }}
                >
                  {c.name}
                </span>
                {/* Bar */}
                <div className="flex-1 h-[4px] bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                  />
                </div>
                {/* Percentage */}
                <span
                  className="flex-shrink-0 text-right"
                  style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, color: barColor, minWidth: "28px" }}
                >
                  {c.thirtyDayPct !== null ? `${c.thirtyDayPct}%` : "—"}
                </span>
              </a>
            );
          })}
          {remaining > 0 && (
            <a
              href="/coach/clients"
              className="no-underline text-center mt-1 transition-colors hover:text-[#B8933A]"
              style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
            >
              + {remaining} more clients →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pillar Breakdown ─────────────────────────────────────────────

function PillarBreakdownSection({ pillars }: { pillars: PillarBreakdown[] }) {
  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
      style={{ padding: "16px 20px" }}
    >
      <SectionLabel>Pillar Breakdown</SectionLabel>

      <div className="grid grid-cols-4 gap-[7px] mt-3">
        {pillars.map((p) => {
          const pct = p.avgPct;
          const hasData = pct !== null && p.taskCount > 0;
          const color = hasData ? complianceColor(pct) : "#4A3F2A";
          const borderColor = hasData
            ? (pct! >= 70 ? "#0D3A25" : pct! >= 40 ? "#2A2010" : "#2A1010")
            : "#1A1A1A";
          const bgColor = hasData
            ? (pct! >= 70 ? "rgba(29,158,117,0.08)" : pct! >= 40 ? "rgba(184,147,58,0.08)" : "rgba(122,30,30,0.10)")
            : "#111111";

          return (
            <div
              key={p.pillar}
              className="rounded-[5px] border flex flex-col items-center justify-center"
              style={{ background: bgColor, borderColor, padding: "10px 6px" }}
            >
              <span style={{ fontFamily: cinzel, fontSize: "16px", fontWeight: 900, color, lineHeight: 1 }}>
                {hasData ? `${pct}%` : "—"}
              </span>
              <span
                className="mt-1 uppercase"
                style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#807868" }}
              >
                {p.label}
              </span>
              {hasData && (
                <div className="w-full h-[3px] bg-[#1A1A1A] rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct!, 100)}%`, background: color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Compliance Trend ─────────────────────────────────────────────

function ComplianceTrendSection({ days }: { days: DailyCompliance[] }) {
  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
      style={{ padding: "16px 20px" }}
    >
      <SectionLabel>Compliance Trend</SectionLabel>

      <div className="grid grid-cols-7 gap-[4px] mt-3">
        {days.map((d) => {
          const pct = d.avgPct;
          const hasData = pct !== null;
          const bgColor = !hasData ? "#111111"
            : pct >= 70 ? "rgba(29,158,117,0.15)"
            : pct >= 40 ? "rgba(184,147,58,0.15)"
            : "rgba(122,30,30,0.15)";
          const textColor = !hasData ? "#4A3F2A" : complianceColor(pct);

          return (
            <div
              key={d.date}
              className="rounded-[4px] flex flex-col items-center justify-center"
              style={{ background: bgColor, padding: "8px 2px" }}
            >
              <span style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#807868" }}>
                {d.dayLabel}
              </span>
              <span
                className="mt-0.5"
                style={{ fontFamily: cinzel, fontSize: "12px", fontWeight: 900, color: textColor, lineHeight: 1 }}
              >
                {hasData ? pct : "—"}
              </span>
              {hasData && (
                <span style={{ fontFamily: cinzel, fontSize: "6px", color: "#4A3F2A", marginTop: "1px" }}>%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Coach Insights ───────────────────────────────────────────────

function CoachInsightsSection({ insights }: { insights: CoachInsight[] }) {
  const dotColors: Record<string, string> = {
    green: "#1D9E75",
    gold: "#B8933A",
    crimson: "#7A1E1E",
  };

  return (
    <div
      className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
      style={{ padding: "16px 20px" }}
    >
      <SectionLabel>Coach Insights</SectionLabel>

      {insights.length === 0 ? (
        <EmptyState message="No insights to display." />
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-[5px] border border-[#1A1A1A] px-3 py-2"
              style={{ background: "#111111" }}
            >
              <span
                className="flex-shrink-0 rounded-full mt-1"
                style={{ width: "5px", height: "5px", background: dotColors[insight.dot] ?? "#807868" }}
              />
              <p style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0", lineHeight: 1.5 }}>
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
