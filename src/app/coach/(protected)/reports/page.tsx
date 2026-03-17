// ─────────────────────────────────────────────
// COACH REPORTS — Client Progress Report
//
// Server Component. Renders a comprehensive,
// print-friendly single-client report. Client
// selection via searchParam triggers re-render.
// ─────────────────────────────────────────────

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getActiveClients } from "@/lib/coach/notes/getCoachNotes";
import { getClientReport } from "@/lib/coach/reports/getClientReport";
import type { ClientReportData } from "@/lib/coach/reports/getClientReport";
import type { StatusLabel } from "@/lib/coach/reports/types";
import { WeightHistoryChart } from "@/components/coach/WeightHistoryChart";
import { ReportControls } from "./ReportControls";
import { PrintReport } from "./PrintReport";

export const dynamic = "force-dynamic";

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

// ── Resolve coach ────────────────────────────────────────────────

async function resolveCoach(): Promise<{ id: string; name: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/coach/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, name")
    .eq("auth_id", user.id)
    .eq("role", "coach")
    .maybeSingle();

  if (!data) redirect("/login");
  return { id: data.id, name: data.name };
}

// ── Display helpers ──────────────────────────────────────────────

function complianceColor(pct: number | null): string {
  if (pct === null) return "#4A3F2A";
  if (pct >= 70) return "#1D9E75";
  if (pct >= 40) return "#B8933A";
  return "#7A1E1E";
}

function statusConfig(status: StatusLabel): { label: string; color: string; bg: string; border: string } {
  switch (status) {
    case "thriving": return { label: "Thriving", color: "#1D9E75", bg: "rgba(29,158,117,0.08)", border: "#0D3A25" };
    case "on_track": return { label: "On Track", color: "#1D9E75", bg: "rgba(29,158,117,0.06)", border: "#0D3A25" };
    case "needs_attention": return { label: "Needs Attention", color: "#B8933A", bg: "rgba(184,147,58,0.08)", border: "#2A2010" };
    case "at_risk": return { label: "At Risk", color: "#B8933A", bg: "rgba(184,147,58,0.10)", border: "#2A2010" };
    case "critical": return { label: "Critical", color: "#7A1E1E", bg: "rgba(122,30,30,0.10)", border: "#2A1010" };
  }
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Page ─────────────────────────────────────────────────────────

export default async function CoachReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const coach = await resolveCoach();
  const params = await searchParams;
  const selectedClientId = params.client ?? "";

  const clients = await getActiveClients();

  let report: ClientReportData | null = null;
  if (selectedClientId) {
    report = await getClientReport(selectedClientId, coach.name);
  }

  return (
    <>
      {/* ── Print styles: hide dark UI, show PrintReport ── */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .screen-only { display: none !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      {/* ── Print-only: clean white report ──────── */}
      {report && <PrintReport report={report} />}

      {/* ── Screen-only: dark coach UI ─────────── */}
      <div className="screen-only -mx-6 -mt-8 lg:-mx-8">

        {/* ── Page header (hidden in print) ────────── */}
        <div
          className="border-b border-[#1A1A1A] print:hidden"
          style={{ background: "#0A0A0A", padding: "14px 20px" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontFamily: cinzel, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#F4EEE4" }}>
                Reports
              </h1>
              <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#4A3F2A", marginTop: "1px" }}>
                Client progress reports and coaching insights
              </p>
            </div>
            <ReportControls clients={clients} selectedClientId={selectedClientId} />
          </div>
        </div>

        {/* ── Report content ──────────────────────── */}
        <div style={{ padding: "18px 20px" }}>
          {!report ? (
            <EmptyState />
          ) : (
            <ReportBody report={report} />
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] py-20 text-center print:hidden">
      <p style={{ fontFamily: cinzel, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#4A3F2A", marginBottom: "6px" }}>
        NO CLIENT SELECTED
      </p>
      <p style={{ fontFamily: ebGaramond, fontSize: "13px", fontStyle: "italic", color: "#807868" }}>
        Select a client above to generate their progress report.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// REPORT BODY
// ══════════════════════════════════════════════════════════════════

function ReportBody({ report }: { report: ClientReportData }) {
  const periodLabel = `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`;
  const sc = statusConfig(report.statusLabel);

  return (
    <div className="max-w-[820px] mx-auto space-y-4 print:space-y-3">

      {/* ── 1. Report Header ─────────────────────────── */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
        style={{ padding: "18px 22px" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[#B8933A] uppercase print:text-black"
            style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.14em" }}
          >
            PulseOS Client Report
          </span>
          <span style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#807868" }}>
            {periodLabel}
          </span>
        </div>

        <h2
          className="text-[#F4EEE4] print:text-black"
          style={{ fontFamily: cinzel, fontSize: "18px", fontWeight: 700, letterSpacing: "0.04em" }}
        >
          {report.clientName}
        </h2>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <span style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#807868" }}>
            Coach: {report.coachName}
          </span>
          {report.goalName && (
            <span style={{ fontFamily: ebGaramond, fontSize: "12px", fontStyle: "italic", color: "#B8933A" }}>
              Goal: {report.goalName}
            </span>
          )}
        </div>
      </section>

      {/* ── 2. Status + Summary Strip ────────────────── */}
      <section
        className="rounded-[7px] border print:bg-white print:border-gray"
        style={{ background: sc.bg, borderColor: sc.border, padding: "14px 22px" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <span
                className="uppercase rounded-[3px]"
                style={{
                  fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em",
                  color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                  padding: "2px 8px",
                }}
              >
                {sc.label}
              </span>
              {report.daysSinceActive !== null && report.daysSinceActive > 0 && (
                <span style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#807868" }}>
                  Last active {report.daysSinceActive}d ago
                </span>
              )}
            </div>
            <p style={{ fontFamily: ebGaramond, fontSize: "13px", fontStyle: "italic", color: "#DDD5C0", lineHeight: 1.5 }}>
              {report.statusHeadline}
            </p>
          </div>

          {/* Quick metrics */}
          <div className="flex gap-3 flex-shrink-0">
            <QuickMetric label="Today" value={report.todayPct !== null ? `${report.todayPct}%` : "—"} color={complianceColor(report.todayPct)} />
            <QuickMetric label="7-Day" value={`${report.sevenDayPct}%`} color={complianceColor(report.sevenDayPct)} />
            <QuickMetric label="30-Day" value={`${report.thirtyDayPct}%`} color={complianceColor(report.thirtyDayPct)} />
            {report.currentWeight !== null && (
              <QuickMetric label="Weight" value={`${report.currentWeight}`} color="#F4EEE4" unit="lbs" />
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Goal Progress ──────────────────────────── */}
      {report.goalMetrics.length > 0 && (
        <section
          className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
          style={{ padding: "16px 22px" }}
        >
          <SectionLabel>Goal Progress</SectionLabel>

          <div className="mt-3 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#807868" }}>
                TOWARD TARGET
              </span>
              <span style={{ fontFamily: cinzel, fontSize: "14px", fontWeight: 700, color: "#F4EEE4" }}>
                {report.goalProgress}%
              </span>
            </div>
            <div className="h-[5px] bg-[#1A1A1A] rounded-full overflow-hidden print:bg-gray-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(report.goalProgress, 100)}%`,
                  background: complianceColor(report.goalProgress),
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[6px]">
            {report.goalMetrics.map((m) => (
              <div key={m.label}>
                <span className="uppercase block mb-1" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
                  {m.label}
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <MetricCell label="Start" value={m.start} unit={m.unit} />
                  <MetricCell label="Current" value={m.current} unit={m.unit} highlight />
                  <MetricCell label="Target" value={m.target} unit={m.unit} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Weight / Body Metrics History ──────────── */}
      {report.weightHistory.length >= 2 && (() => {
        const first = report.weightHistory[0].weight;
        const last = report.weightHistory[report.weightHistory.length - 1].weight;
        const delta = last - first;
        const sign = delta > 0 ? "+" : "";
        const deltaColor = delta < 0 ? "#1D9E75" : delta > 0 ? "#7A1E1E" : "#807868";
        const deltaLabel = delta < -1 ? "losing weight — on track"
          : delta > 1 ? "weight trending up"
          : "weight stable";
        return (
          <section
            className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
            style={{ padding: "16px 22px" }}
          >
            <div className="flex items-center justify-between">
              <SectionLabel>Weight History</SectionLabel>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: cinzel, fontSize: "10px", fontWeight: 900, color: deltaColor }}>
                  {sign}{delta.toFixed(1)} lbs
                </span>
                <span style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#807868" }}>
                  {deltaLabel}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <WeightHistoryChart data={report.weightHistory} />
            </div>
            <p className="mt-1.5" style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
              {report.weightHistory.length} data points · {first.toFixed(1)} → {last.toFixed(1)} lbs
            </p>
          </section>
        );
      })()}

      {/* ── 5. Compliance Summary ─────────────────────── */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
        style={{ padding: "16px 22px" }}
      >
        <SectionLabel>Compliance Summary</SectionLabel>

        <div className="flex items-center gap-3 mt-3 mb-4">
          <span style={{ fontFamily: cinzel, fontSize: "26px", fontWeight: 900, color: complianceColor(report.thirtyDayPct), lineHeight: 1 }}>
            {report.thirtyDayPct}%
          </span>
          <div>
            <span style={{ fontFamily: ebGaramond, fontSize: "12px", fontStyle: "italic", color: "#807868" }}>
              30-day compliance
            </span>
            {(() => {
              const delta = report.sevenDayPct - report.thirtyDayPct;
              if (delta === 0) return null;
              const arrow = delta > 0 ? "↑" : "↓";
              const color = delta > 0 ? "#1D9E75" : "#B8933A";
              const label = delta > 5 ? "trending up" : delta < -5 ? "compliance declining" : delta > 0 ? "slight uptrend" : "slight dip";
              return (
                <span style={{ fontFamily: ebGaramond, fontSize: "11px", display: "block" }}>
                  <span style={{ color }}>7-day: {report.sevenDayPct}% {arrow}{Math.abs(delta)}pts</span>
                  <span style={{ color: "#4A3F2A" }}> · {label}</span>
                </span>
              );
            })()}
          </div>
        </div>

        {/* 30-Day Trend Sparkline */}
        <div className="mb-4">
          <span className="uppercase block mb-2" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
            30-Day Trend
          </span>
          <div className="flex items-end gap-[2px]" style={{ height: "32px" }}>
            {report.thirtyDayTrend.map((d) => {
              const pct = d.pct ?? 0;
              const h = Math.max(2, (pct / 100) * 32);
              const color = pct >= 70 ? "#1D9E75" : pct >= 40 ? "#B8933A" : pct > 0 ? "#7A1E1E" : "#1A1A1A";
              return (
                <div
                  key={d.date}
                  className="rounded-[1px]"
                  style={{ width: "100%", height: `${h}px`, background: color, flex: 1, minWidth: "2px" }}
                  title={`${d.date}: ${d.pct ?? 0}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span style={{ fontFamily: cinzel, fontSize: "5px", color: "#4A3F2A" }}>
              {fmtShortDate(report.thirtyDayTrend[0]?.date ?? report.periodStart)}
            </span>
            <span style={{ fontFamily: cinzel, fontSize: "5px", color: "#4A3F2A" }}>
              {fmtShortDate(report.thirtyDayTrend[report.thirtyDayTrend.length - 1]?.date ?? report.periodEnd)}
            </span>
          </div>
        </div>

        {/* Weekly heatmap */}
        <div className="mb-4">
          <span className="uppercase block mb-2" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
            This Week
          </span>
          <div className="grid grid-cols-7 gap-[3px]">
            {report.weeklyTrend.map((d) => {
              const hasData = d.pct !== null;
              const bgColor = !hasData ? "#111111"
                : d.pct! >= 70 ? "rgba(29,158,117,0.15)"
                : d.pct! >= 40 ? "rgba(184,147,58,0.15)"
                : "rgba(122,30,30,0.15)";
              return (
                <div key={d.date} className="rounded-[3px] flex flex-col items-center" style={{ background: bgColor, padding: "5px 2px" }}>
                  <span style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, color: "#807868" }}>{d.dayLabel}</span>
                  <span style={{ fontFamily: cinzel, fontSize: "11px", fontWeight: 900, color: hasData ? complianceColor(d.pct) : "#4A3F2A", lineHeight: 1, marginTop: "2px" }}>
                    {hasData ? `${d.pct}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pillar breakdown */}
        <span className="uppercase block mb-2" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
          Pillar Breakdown
        </span>
        <div className="grid grid-cols-4 gap-[6px]">
          {report.pillars.map((p) => {
            const hasData = p.avgPct !== null && p.taskCount > 0;
            const color = hasData ? complianceColor(p.avgPct) : "#4A3F2A";
            return (
              <div key={p.label} className="rounded-[4px] border border-[#1A1A1A] flex flex-col items-center" style={{ padding: "7px 4px" }}>
                <span style={{ fontFamily: cinzel, fontSize: "14px", fontWeight: 900, color, lineHeight: 1 }}>
                  {hasData ? `${p.avgPct}%` : "—"}
                </span>
                <span className="mt-0.5 uppercase" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em", color: "#807868" }}>
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. Coaching Signals ────────────────────────── */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
        style={{ padding: "16px 22px" }}
      >
        <SectionLabel>Coaching Signals</SectionLabel>
        <div className="flex flex-col gap-2 mt-3">
          {report.signals.map((sig, idx) => {
            const dotColors: Record<string, string> = { green: "#1D9E75", gold: "#B8933A", crimson: "#7A1E1E" };
            return (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 rounded-full mt-1.5" style={{ width: "5px", height: "5px", background: dotColors[sig.dot] ?? "#807868" }} />
                <p style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0", lineHeight: 1.5 }}>
                  {sig.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 7. Wins + Focus Areas (two-column) ────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Wins */}
        <section
          className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
          style={{ padding: "14px 18px" }}
        >
          <SectionLabel>Wins This Period</SectionLabel>
          <div className="flex flex-col gap-2 mt-3">
            {report.wins.length > 0 ? report.wins.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-1" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#1D9E75" }} />
                <p style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0", lineHeight: 1.4 }}>{w}</p>
              </div>
            )) : (
              <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
                No standout wins yet — keep building momentum.
              </p>
            )}
          </div>
        </section>

        {/* Focus Areas */}
        <section
          className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
          style={{ padding: "14px 18px" }}
        >
          <SectionLabel>Focus Areas</SectionLabel>
          <div className="flex flex-col gap-2 mt-3">
            {report.focusAreas.length > 0 ? report.focusAreas.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-1" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#B8933A" }} />
                <p style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0", lineHeight: 1.4 }}>{a}</p>
              </div>
            )) : (
              <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
                No focus areas flagged — client is on track.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── 8. Recommended Actions + Quick Links ───────── */}
      <section
        className="rounded-[7px] border border-[#2A2010] print:hidden"
        style={{ background: "rgba(184,147,58,0.05)", padding: "14px 22px" }}
      >
        <SectionLabel>Recommended Coaching Actions</SectionLabel>
        <div className="flex flex-col gap-2 mt-3">
          {(() => {
            const recs: { text: string; dot: string }[] = [];
            if (report.statusLabel === "thriving" || report.statusLabel === "on_track") {
              recs.push({ text: "Reinforce consistency — client is performing well. Acknowledge wins.", dot: "#1D9E75" });
            }
            if (report.sevenDayPct < report.thirtyDayPct - 5) {
              recs.push({ text: "Address the recent compliance dip before it becomes a trend.", dot: "#B8933A" });
            }
            if (report.focusAreas.length > 0) {
              recs.push({ text: `Focus on weakest area: ${report.focusAreas[0]}`, dot: "#B8933A" });
            }
            if (report.daysSinceActive !== null && report.daysSinceActive >= 3) {
              recs.push({ text: `Re-engage client — inactive for ${report.daysSinceActive} days. Send a check-in message.`, dot: "#7A1E1E" });
            }
            if (report.thirtyDayPct < 40) {
              recs.push({ text: "Consider simplifying habits or adjusting targets to rebuild momentum.", dot: "#7A1E1E" });
            }
            if (recs.length === 0) {
              recs.push({ text: "No specific actions flagged. Continue current coaching plan.", dot: "#1D9E75" });
            }
            return recs.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 rounded-full mt-1.5" style={{ width: "5px", height: "5px", background: r.dot }} />
                <p style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0", lineHeight: 1.4 }}>{r.text}</p>
              </div>
            ));
          })()}
        </div>
        {/* Quick action links */}
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #2A2010" }}>
          <a
            href={`/coach/notes?client=${report.clientId}`}
            className="no-underline rounded-[4px] border uppercase"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", color: "#B8933A", borderColor: "#2A2010", cursor: "pointer" }}
          >
            Add Coach Note
          </a>
          <a
            href={`/coach/clients/${report.clientId}`}
            className="no-underline rounded-[4px] border uppercase"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", color: "#807868", borderColor: "#1A1A1A", cursor: "pointer" }}
          >
            Open Profile
          </a>
          <a
            href={`/coach/alerts`}
            className="no-underline rounded-[4px] border uppercase"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", color: "#807868", borderColor: "#1A1A1A", cursor: "pointer" }}
          >
            View Alerts
          </a>
        </div>
      </section>

      {/* ── 9. Coaching Summary (editable, not persisted) */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
        style={{ padding: "16px 22px" }}
      >
        <SectionLabel>Coach Notes</SectionLabel>

        <div className="mt-3 space-y-3">
          <div>
            <span className="uppercase block mb-1" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
              Observations
            </span>
            <div
              contentEditable
              suppressContentEditableWarning
              className="rounded border border-[#1A1A1A] min-h-[48px] print:border-gray-300 print:text-black"
              style={{
                fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
                background: "#111111", padding: "8px 10px", lineHeight: 1.6, outline: "none",
              }}
            />
          </div>
          <div>
            <span className="uppercase block mb-1" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
              Plan for Next Month
            </span>
            <div
              contentEditable
              suppressContentEditableWarning
              className="rounded border border-[#1A1A1A] min-h-[48px] print:border-gray-300 print:text-black"
              style={{
                fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
                background: "#111111", padding: "8px 10px", lineHeight: 1.6, outline: "none",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Print footer ──────────────────────────────── */}
      <div className="text-center pt-2 pb-4">
        <p style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#4A3F2A" }}>
          GENERATED BY PULSEOS · {fmtDate(new Date().toISOString().slice(0, 10))}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[#807868] uppercase print:text-black"
      style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.12em" }}
    >
      {children}
    </p>
  );
}

function MetricCell({ label, value, unit, highlight }: { label: string; value: number | null; unit: string; highlight?: boolean }) {
  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-[3px] py-1.5 px-1 text-center print:bg-gray-50">
      <p
        className={highlight ? "text-[#F4EEE4]" : "text-[#807868]"}
        style={{ fontFamily: cinzel, fontSize: "10px", fontWeight: 700 }}
      >
        {value != null ? `${value}${unit}` : "—"}
      </p>
      <p style={{ fontFamily: cinzel, fontSize: "5px", letterSpacing: "0.06em", color: "#4A3F2A" }}>
        {label.toUpperCase()}
      </p>
    </div>
  );
}

function QuickMetric({ label, value, color, unit }: { label: string; value: string; color: string; unit?: string }) {
  return (
    <div className="text-center">
      <span style={{ fontFamily: cinzel, fontSize: "14px", fontWeight: 900, color, lineHeight: 1, display: "block" }}>
        {value}
      </span>
      {unit && (
        <span style={{ fontFamily: cinzel, fontSize: "6px", color: "#807868" }}>{unit}</span>
      )}
      <span className="uppercase block" style={{ fontFamily: cinzel, fontSize: "5px", fontWeight: 700, letterSpacing: "0.06em", color: "#4A3F2A", marginTop: "1px" }}>
        {label}
      </span>
    </div>
  );
}
