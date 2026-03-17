// ─────────────────────────────────────────────
// COACH ANALYTICS — Roster-level operational view
//
// Uses the dashboard data layer (direct queries) rather
// than the RPC path. Computes trends, averages, and
// insights from DashboardClient[] data.
// ─────────────────────────────────────────────

import { getCoachDashboardData } from "@/lib/coach/dashboard/getCoachDashboardData";
import type { DashboardClient } from "@/lib/coach/dashboard/getCoachDashboardData";
import { resolveCoachId } from "@/lib/coach/resolveCoachId";

import { AnalyticsMetricCard } from "@/components/coach/analytics/AnalyticsMetricCard";
import { TrendCard } from "@/components/coach/analytics/TrendCard";
import { ClientTrendList } from "@/components/coach/analytics/ClientTrendList";
import { HabitBreakdownCard } from "@/components/coach/analytics/HabitBreakdownCard";
import { CoachInsightPanel } from "@/components/coach/analytics/CoachInsightPanel";
import { RosterHealthBar } from "@/components/coach/RosterHealthBar";

export const dynamic = "force-dynamic";

// ── Display helpers (visual mapping only) ────────────────────────

function complianceColor(pct: number): string {
  if (pct >= 70) return "#1D9E75";
  if (pct >= 40) return "#B8933A";
  return "#7A1E1E";
}

function complianceAccent(pct: number): "green" | "gold" | "crimson" {
  if (pct >= 70) return "green";
  if (pct >= 40) return "gold";
  return "crimson";
}

function trendClientStatusColor(pct: number): string {
  return complianceColor(pct);
}

// ── Trend detection from dashboard clients ───────────────────────

interface TrendItem {
  id: string;
  name: string;
  thirtyDayPct: number;
  delta: number;
}

function computeTrends(
  clients: DashboardClient[],
  direction: "improving" | "declining",
  limit: number,
): TrendItem[] {
  const withData = clients.filter(
    (c) => c.sevenDayPct !== null && c.thirtyDayPct !== null,
  );

  const filtered = direction === "improving"
    ? withData.filter((c) => c.sevenDayPct! > c.thirtyDayPct!)
    : withData.filter((c) => c.sevenDayPct! < c.thirtyDayPct!);

  const sorted = [...filtered].sort((a, b) => {
    const deltaA = a.sevenDayPct! - a.thirtyDayPct!;
    const deltaB = b.sevenDayPct! - b.thirtyDayPct!;
    return direction === "improving" ? deltaB - deltaA : deltaA - deltaB;
  });

  return sorted.slice(0, limit).map((c) => ({
    id: c.id,
    name: c.name,
    thirtyDayPct: c.thirtyDayPct!,
    delta: c.sevenDayPct! - c.thirtyDayPct!,
  }));
}

// ── Roster averages ──────────────────────────────────────────────

function avg(clients: DashboardClient[], key: "todayPct" | "sevenDayPct" | "thirtyDayPct"): number {
  const vals = clients.map((c) => c[key]).filter((v): v is number => v !== null);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ── Deterministic insights ───────────────────────────────────────

interface Insight {
  icon: string;
  text: string;
  accent: "green" | "gold" | "crimson" | "neutral";
}

function generateInsights(
  clients: DashboardClient[],
  _avgToday: number,
  avg7d: number,
  avg30d: number,
): Insight[] {
  const insights: Insight[] = [];
  const total = clients.length;
  const flaggedCount = clients.filter((c) => c.statusLabel === "critical" || c.statusLabel === "gone_dark").length;
  const thriving = clients.filter((c) => c.statusLabel === "thriving").length;

  if (flaggedCount > 0) {
    insights.push({
      icon: "◉",
      text: `${flaggedCount} client${flaggedCount !== 1 ? "s" : ""} flagged as critical or gone dark.`,
      accent: "crimson",
    });
  }

  if (avg7d > avg30d + 5) {
    insights.push({
      icon: "△",
      text: `Roster compliance trending up — 7-day (${avg7d}%) is ${avg7d - avg30d}pts above 30-day (${avg30d}%).`,
      accent: "green",
    });
  } else if (avg7d < avg30d - 5) {
    insights.push({
      icon: "▽",
      text: `Roster compliance declining — 7-day (${avg7d}%) is ${avg30d - avg7d}pts below 30-day (${avg30d}%).`,
      accent: "gold",
    });
  }

  if (thriving > total * 0.6 && total > 0) {
    insights.push({
      icon: "★",
      text: `${Math.round((thriving / total) * 100)}% of your roster is thriving.`,
      accent: "green",
    });
  }

  if (insights.length === 0 && flaggedCount === 0) {
    insights.push({
      icon: "◈",
      text: "No critical patterns detected. Roster is stable.",
      accent: "green",
    });
  }

  return insights;
}

// ── Page ─────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const coachId = await resolveCoachId();
  const dashboard = await getCoachDashboardData(coachId);
  const { clients, roster } = dashboard;

  const avgToday = avg(clients, "todayPct");
  const avg7d = avg(clients, "sevenDayPct");
  const avg30d = avg(clients, "thirtyDayPct");
  const flaggedCount = roster.critical + roster.goneDark;

  const improved = computeTrends(clients, "improving", 5);
  const declining = computeTrends(clients, "declining", 5);
  const insights = generateInsights(clients, avgToday, avg7d, avg30d);

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
          {todayDate} — {roster.total} active client{roster.total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Page content ──────────────────────────── */}
      <div style={{ padding: "18px" }}>

        {/* ── Summary Metrics Row ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[9px] mb-6">
          <AnalyticsMetricCard
            label="Overall Compliance"
            value={`${avg30d}%`}
            subtext="30-day roster avg"
            accent={complianceAccent(avg30d)}
          />
          <AnalyticsMetricCard
            label="7-Day Trend"
            value={`${avg7d}%`}
            subtext={avg7d >= avg30d ? `+${avg7d - avg30d}pts vs 30d` : `${avg7d - avg30d}pts vs 30d`}
            accent={complianceAccent(avg7d)}
          />
          <AnalyticsMetricCard
            label="30-Day Trend"
            value={`${avg30d}%`}
            subtext="baseline period"
            accent={complianceAccent(avg30d)}
          />
          <AnalyticsMetricCard
            label="Flagged / At Risk"
            value={`${flaggedCount + roster.atRisk}`}
            subtext={`${flaggedCount} critical · ${roster.atRisk} at risk`}
            accent={flaggedCount + roster.atRisk > 0 ? "crimson" : "green"}
          />
        </div>

        {/* ── Roster Distribution ─────────────────── */}
        <div className="mb-6">
          <RosterHealthBar thriving={roster.thriving} atRisk={roster.atRisk} critical={roster.critical} total={roster.total} />
        </div>

        {/* ── Trend Section ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[9px] mb-6">
          <TrendCard
            title="Compliance Trend"
            subtitle="Roster averages across time windows"
            segments={[
              { label: "Today", value: avgToday, color: complianceColor(avgToday) },
              { label: "7-Day Avg", value: avg7d, color: complianceColor(avg7d) },
              { label: "30-Day Avg", value: avg30d, color: complianceColor(avg30d) },
            ]}
          />
          <TrendCard
            title="Status Distribution"
            subtitle="Client status breakdown by percentage"
            segments={roster.total > 0 ? [
              { label: "Thriving", value: Math.round((roster.thriving / roster.total) * 100), color: "#1D9E75" },
              { label: "At Risk", value: Math.round((roster.atRisk / roster.total) * 100), color: "#B8933A" },
              { label: "Critical", value: Math.round((roster.critical / roster.total) * 100), color: "#7A1E1E" },
              { label: "Gone Dark", value: Math.round((roster.goneDark / roster.total) * 100), color: "#2A2010" },
            ] : []}
            emptyMessage="No active clients."
          />
        </div>

        {/* ── Roster Insights ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[9px] mb-6">
          <ClientTrendList
            title="Most Improved"
            subtitle="Largest 7d vs 30d compliance gain"
            clients={improved.map((c) => ({
              ...c,
              value: c.thirtyDayPct,
              statusColor: trendClientStatusColor(c.thirtyDayPct),
            }))}
            emptyMessage="No improving trends detected."
            accent="green"
          />
          <ClientTrendList
            title="Attention Needed"
            subtitle="Largest 7d vs 30d compliance decline"
            clients={declining.map((c) => ({
              ...c,
              value: c.thirtyDayPct,
              statusColor: trendClientStatusColor(c.thirtyDayPct),
            }))}
            emptyMessage="No declining trends. All clients stable."
            accent="crimson"
          />
        </div>

        {/* ── Habit Performance ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[9px] mb-6">
          <HabitBreakdownCard
            title="Highest Adherence Habits"
            subtitle="Requires per-habit compliance data"
          />
          <HabitBreakdownCard
            title="Lowest Adherence Habits"
            subtitle="Requires per-habit compliance data"
          />
        </div>

        {/* ── Coach Insight Panel ─────────────────── */}
        <CoachInsightPanel insights={insights} />

      </div>
    </div>
  );
}
