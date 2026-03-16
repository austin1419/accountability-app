// ─────────────────────────────────────────────
// COACH REPORTS — Monthly Client Report
//
// Server Component. Renders a print-friendly
// single-client report. Client selection via
// searchParam triggers server re-render.
// ─────────────────────────────────────────────

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getActiveClients } from "@/lib/coach/notes/getCoachNotes";
import { getClientReport } from "@/lib/coach/reports/getClientReport";
import type { ClientReportData } from "@/lib/coach/reports/getClientReport";
import { ReportControls } from "./ReportControls";

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
      {/* ── Print styles ─────────────────────────── */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: #fff !important; }
          .print\\:text-black { color: #111 !important; }
          .print\\:border-gray { border-color: #ddd !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>

      <div className="-mx-6 -mt-8 lg:-mx-8">

        {/* ── Controls bar (hidden in print) ──────── */}
        <div
          className="border-b border-[#1A1A1A] print:hidden"
          style={{ background: "#0A0A0A", padding: "10px 18px" }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-[#807868] uppercase"
              style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em" }}
            >
              Monthly Client Report
            </p>
            <ReportControls clients={clients} selectedClientId={selectedClientId} />
          </div>
        </div>

        {/* ── Report content ──────────────────────── */}
        <div style={{ padding: "18px" }}>
          {!report ? (
            <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] py-16 text-center print:hidden">
              <p style={{ fontFamily: ebGaramond, fontSize: "13px", fontStyle: "italic", color: "#4A3F2A" }}>
                Select a client above to generate their monthly report.
              </p>
            </div>
          ) : (
            <ReportBody report={report} />
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// REPORT BODY
// ══════════════════════════════════════════════════════════════════

function ReportBody({ report }: { report: ClientReportData }) {
  const periodLabel = `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`;

  return (
    <div className="max-w-[800px] mx-auto space-y-5 print:space-y-4">

      {/* ── 1. Header ─────────────────────────────── */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray print:shadow-none"
        style={{ padding: "20px 24px" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[#B8933A] uppercase print:text-black"
            style={{ fontFamily: cinzel, fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em" }}
          >
            PulseOS Monthly Report
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

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
          <span style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#807868" }}>
            Coach: {report.coachName}
          </span>
          {report.goalName && (
            <span style={{ fontFamily: ebGaramond, fontSize: "12px", fontStyle: "italic", color: "#B8933A" }}>
              Goal: {report.goalName}
            </span>
          )}
          {report.goalCategory && (
            <span style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#4A3F2A" }}>
              ({report.goalCategory})
            </span>
          )}
        </div>
      </section>

      {/* ── 2. Progress ───────────────────────────── */}
      {report.goalMetrics.length > 0 && (
        <section
          className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
          style={{ padding: "16px 24px" }}
        >
          <SectionLabel>Goal Progress</SectionLabel>

          {/* Progress bar */}
          <div className="mt-3 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", color: "#807868" }}>
                PROGRESS
              </span>
              <span style={{ fontFamily: cinzel, fontSize: "14px", fontWeight: 700, color: "#F4EEE4" }}>
                {report.goalProgress}%
              </span>
            </div>
            <div className="h-[6px] bg-[#1A1A1A] rounded-full overflow-hidden print:bg-gray-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(report.goalProgress, 100)}%`,
                  background: complianceColor(report.goalProgress),
                }}
              />
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-[8px]">
            {report.goalMetrics.map((m) => (
              <div key={m.label}>
                <span className="uppercase block mb-1" style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
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

      {/* ── 3. Compliance Summary ─────────────────── */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
        style={{ padding: "16px 24px" }}
      >
        <SectionLabel>Compliance Summary</SectionLabel>

        {/* 30-day headline */}
        <div className="flex items-center gap-3 mt-3 mb-4">
          <span style={{ fontFamily: cinzel, fontSize: "28px", fontWeight: 900, color: complianceColor(report.thirtyDayPct), lineHeight: 1 }}>
            {report.thirtyDayPct}%
          </span>
          <span style={{ fontFamily: ebGaramond, fontSize: "12px", fontStyle: "italic", color: "#807868" }}>
            30-day compliance
          </span>
        </div>

        {/* Weekly trend */}
        <div className="mb-4">
          <span className="uppercase block mb-2" style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
            Weekly Trend
          </span>
          <div className="grid grid-cols-7 gap-[4px]">
            {report.weeklyTrend.map((d) => {
              const pct = d.pct;
              const hasData = pct !== null;
              const bgColor = !hasData ? "#111111"
                : pct >= 70 ? "rgba(29,158,117,0.15)"
                : pct >= 40 ? "rgba(184,147,58,0.15)"
                : "rgba(122,30,30,0.15)";
              return (
                <div key={d.date} className="rounded-[4px] flex flex-col items-center" style={{ background: bgColor, padding: "6px 2px" }}>
                  <span style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, color: "#807868" }}>{d.dayLabel}</span>
                  <span style={{ fontFamily: cinzel, fontSize: "12px", fontWeight: 900, color: hasData ? complianceColor(d.pct) : "#4A3F2A", lineHeight: 1, marginTop: "2px" }}>
                    {hasData ? `${d.pct}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pillar breakdown */}
        <span className="uppercase block mb-2" style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
          Pillar Breakdown
        </span>
        <div className="grid grid-cols-4 gap-[7px]">
          {report.pillars.map((p) => {
            const hasData = p.avgPct !== null && p.taskCount > 0;
            const color = hasData ? complianceColor(p.avgPct) : "#4A3F2A";
            return (
              <div key={p.label} className="rounded-[5px] border border-[#1A1A1A] flex flex-col items-center" style={{ padding: "8px 4px" }}>
                <span style={{ fontFamily: cinzel, fontSize: "14px", fontWeight: 900, color, lineHeight: 1 }}>
                  {hasData ? `${p.avgPct}%` : "—"}
                </span>
                <span className="mt-0.5 uppercase" style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#807868" }}>
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Coaching Signals ────────────────────── */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
        style={{ padding: "16px 24px" }}
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

      {/* ── 5. Coaching Summary (editable, not persisted) ── */}
      <section
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] print:bg-white print:border-gray"
        style={{ padding: "16px 24px" }}
      >
        <SectionLabel>Coaching Summary</SectionLabel>

        <div className="mt-3 space-y-3">
          <div>
            <span className="uppercase block mb-1" style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
              Coach Observations
            </span>
            <div
              contentEditable
              suppressContentEditableWarning
              className="rounded border border-[#1A1A1A] min-h-[60px] print:border-gray-300 print:text-black"
              style={{
                fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
                background: "#111111", padding: "8px 10px", lineHeight: 1.6,
                outline: "none",
              }}
            />
          </div>
          <div>
            <span className="uppercase block mb-1" style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}>
              Focus for Next Month
            </span>
            <div
              contentEditable
              suppressContentEditableWarning
              className="rounded border border-[#1A1A1A] min-h-[60px] print:border-gray-300 print:text-black"
              style={{
                fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
                background: "#111111", padding: "8px 10px", lineHeight: 1.6,
                outline: "none",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Print footer ──────────────────────────── */}
      <div className="text-center pt-2 pb-4">
        <p style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#4A3F2A" }}>
          GENERATED BY PULSEOS · {fmtDate(new Date().toISOString().slice(0, 10))}
        </p>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[#807868] uppercase print:text-black"
      style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em" }}
    >
      {children}
    </p>
  );
}

function MetricCell({ label, value, unit, highlight }: { label: string; value: number | null; unit: string; highlight?: boolean }) {
  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-[4px] py-1.5 px-1 text-center print:bg-gray-50">
      <p
        className={highlight ? "text-[#F4EEE4]" : "text-[#807868]"}
        style={{ fontFamily: cinzel, fontSize: "11px", fontWeight: 700 }}
      >
        {value != null ? `${value}${unit}` : "—"}
      </p>
      <p style={{ fontFamily: cinzel, fontSize: "5px", letterSpacing: "0.06em", color: "#4A3F2A" }}>
        {label.toUpperCase()}
      </p>
    </div>
  );
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
