// ─────────────────────────────────────────────
// COACH ANALYTICS — Roster-level operational view
//
// Pure display layer. All aggregation, trend detection,
// and insight generation lives in getCoachAnalytics().
// This page only reads precomputed values.
// ─────────────────────────────────────────────

import { getCoachAnalytics } from "@/lib/coach/analytics/getCoachAnalytics";
import { resolveCoachId } from "@/lib/coach/resolveCoachId";

import { AnalyticsMetricCard } from "@/components/coach/analytics/AnalyticsMetricCard";
import { TrendCard } from "@/components/coach/analytics/TrendCard";
import { ClientTrendList } from "@/components/coach/analytics/ClientTrendList";
import { HabitBreakdownCard } from "@/components/coach/analytics/HabitBreakdownCard";
import { CoachInsightPanel } from "@/components/coach/analytics/CoachInsightPanel";
import { RosterHealthBar } from "@/components/coach/RosterHealthBar";

export const dynamic = "force-dynamic";

// ── Display helpers (visual mapping only, no business logic) ─────

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

function trendClientStatusColor(thirtyDayPct: number): string {
  return complianceColor(thirtyDayPct);
}

// ── Page ─────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const coachId = await resolveCoachId();
  const analytics = await getCoachAnalytics(coachId);

  const {
    thriving, atRisk, critical, total,
    compliance, flaggedCount,
    improved, declining, insights,
  } = analytics;

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
          {todayDate} — {total} active client{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Page content ──────────────────────────── */}
      <div style={{ padding: "18px" }}>

        {/* ── Summary Metrics Row ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[9px] mb-6">
          <AnalyticsMetricCard
            label="Overall Compliance"
            value={`${compliance.thirtyDay}%`}
            subtext="30-day roster avg"
            accent={complianceAccent(compliance.thirtyDay)}
          />
          <AnalyticsMetricCard
            label="7-Day Trend"
            value={`${compliance.sevenDay}%`}
            subtext={
              compliance.sevenDay >= compliance.thirtyDay
                ? `+${compliance.sevenDay - compliance.thirtyDay}pts vs 30d`
                : `${compliance.sevenDay - compliance.thirtyDay}pts vs 30d`
            }
            accent={complianceAccent(compliance.sevenDay)}
          />
          <AnalyticsMetricCard
            label="30-Day Trend"
            value={`${compliance.thirtyDay}%`}
            subtext="baseline period"
            accent={complianceAccent(compliance.thirtyDay)}
          />
          <AnalyticsMetricCard
            label="Flagged / At Risk"
            value={`${flaggedCount + atRisk}`}
            subtext={`${flaggedCount} critical · ${atRisk} at risk`}
            accent={flaggedCount + atRisk > 0 ? "crimson" : "green"}
          />
        </div>

        {/* ── Roster Distribution ─────────────────── */}
        <div className="mb-6">
          <RosterHealthBar thriving={thriving} atRisk={atRisk} critical={critical} total={total} />
        </div>

        {/* ── Trend Section ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[9px] mb-6">
          <TrendCard
            title="Compliance Trend"
            subtitle="Roster averages across time windows"
            segments={[
              { label: "Today", value: compliance.today, color: complianceColor(compliance.today) },
              { label: "7-Day Avg", value: compliance.sevenDay, color: complianceColor(compliance.sevenDay) },
              { label: "30-Day Avg", value: compliance.thirtyDay, color: complianceColor(compliance.thirtyDay) },
            ]}
          />
          <TrendCard
            title="Status Distribution"
            subtitle="Client status breakdown by percentage"
            segments={total > 0 ? [
              { label: "Thriving", value: Math.round((thriving / total) * 100), color: "#1D9E75" },
              { label: "At Risk", value: Math.round((atRisk / total) * 100), color: "#B8933A" },
              { label: "Critical", value: Math.round((critical / total) * 100), color: "#7A1E1E" },
              { label: "Gone Dark", value: Math.round((analytics.goneDark / total) * 100), color: "#2A2010" },
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
