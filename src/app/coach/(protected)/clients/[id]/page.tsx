// ─────────────────────────────────────────────
// COACH — Client Profile
//
// Primary coaching screen. Two-column layout with
// goal progress, compliance, health flags, body metrics,
// habits, and coach notes.
//
// Server Component — PulseOS design system.
// ─────────────────────────────────────────────

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchClientDetail } from "@/lib/server-queries";
import type { HealthFlag } from "@/lib/server-queries";
import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";

import { AddHabitModal } from "./AddHabitModal";
import { HabitsTabs } from "./HabitsTabs";
import { EditWeightsButton } from "./EditWeightsButton";
import { ClientNotes } from "./ClientNotes";
import { ArchiveClientButton } from "./ArchiveClientButton";
import { ChangeGoalModal } from "./ChangeGoalModal";
import { getClientTimeline } from "@/lib/coach/timeline/getClientTimeline";
import { ClientTimeline } from "@/components/coach/timeline/ClientTimeline";
import { detectBehaviorPatterns } from "@/lib/coach/patterns/detectBehaviorPatterns";
import { PatternInsightCard } from "@/components/coach/patterns/PatternInsightCard";

export const dynamic = "force-dynamic";

// ── Design tokens ────────────────────────────────────────────────

const healthFlagLabels: Record<HealthFlag, string> = {
  low_readiness:          "Low Readiness",
  recovery_deficit:       "Recovery Deficit",
  high_stress_low_energy: "High Stress / Low Energy",
  sleep_deficit:          "Sleep Deficit",
  nutrition_slip:         "Nutrition Slip",
  training_gap:           "Training Gap",
};

const healthFlagIcons: Record<HealthFlag, string> = {
  low_readiness:          "◉",
  recovery_deficit:       "↻",
  high_stress_low_energy: "⚡",
  sleep_deficit:          "☽",
  nutrition_slip:         "▽",
  training_gap:           "△",
};

function complianceColor(pct: number) {
  if (pct >= COMPLIANCE_TARGET) return { bar: "bg-[#1D9E75]", text: "text-[#1D9E75]" };
  if (pct >= 50)               return { bar: "bg-[#B8933A]", text: "text-[#B8933A]" };
  return                              { bar: "bg-[#7A1E1E]", text: "text-[#7A1E1E]" };
}

function progressBarColor(pct: number): string {
  if (pct >= 70) return "bg-[#1D9E75]";
  if (pct >= 40) return "bg-[#B8933A]";
  return "bg-[#7A1E1E]";
}

// ── Page ─────────────────────────────────────────────────────────

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, timelineEvents] = await Promise.all([
    fetchClientDetail(id),
    getClientTimeline(id),
  ]);

  if (!client) notFound();

  const behaviorPatterns = detectBehaviorPatterns({
    events: timelineEvents,
    todayPct: client.todayPercent,
    weekPct: client.weekPercent,
    monthPct: client.monthPercent,
  });

  const isOnTrack =
    client.todayPercent >= COMPLIANCE_TARGET &&
    client.weekPercent  >= COMPLIANCE_TARGET &&
    client.monthPercent >= COMPLIANCE_TARGET;

  const goalDateLabel = client.goal?.goal_date
    ? new Date(client.goal.goal_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day:   "numeric",
        year:  "numeric",
      })
    : null;

  return (
    <div className="space-y-4">

      {/* ════════════════════════════════════════════
          CLIENT HEADER
          ════════════════════════════════════════════ */}
      <div
        className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
        style={{ padding: "16px 20px" }}
      >
        {/* Back link */}
        <Link
          href="/coach/clients"
          className="inline-flex items-center gap-1 text-[#807868] hover:text-[#DDD5C0] transition-colors mb-3"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.1em" }}
        >
          ← CLIENTS
        </Link>

        <div className="flex items-start justify-between gap-4">
          {/* Left: identity + goal + compliance */}
          <div className="min-w-0 flex-1">
            {/* Name + status inline */}
            <div className="flex items-center gap-3">
              <h1
                className="text-[#F4EEE4] truncate"
                style={{ fontFamily: "'Cinzel', serif", fontSize: "20px", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.2 }}
              >
                {client.name}
              </h1>
              <span
                className={`flex-shrink-0 px-2.5 py-1 rounded border text-[9px] font-semibold uppercase tracking-wider ${
                  isOnTrack
                    ? "text-[#1D9E75] border-[#0D3A25] bg-[rgba(29,158,117,0.08)]"
                    : "text-[#7A1E1E] border-[#2A1010] bg-[rgba(122,30,30,0.10)]"
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {isOnTrack ? "On Track" : "Needs Attention"}
              </span>
            </div>

            {/* Goal name + contact */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {client.goal && (
                <span className="text-[#B8933A]" style={{ fontFamily: "'EB Garamond', serif", fontSize: "13px", fontStyle: "italic" }}>
                  {client.goal.goal_name}
                </span>
              )}
              {client.goal && <span className="text-[#2A2A2A]">·</span>}
              <span className="text-[#807868]" style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px" }}>
                {client.email}
              </span>
              {client.phone && (
                <>
                  <span className="text-[#2A2A2A]">·</span>
                  <span className="text-[#807868]" style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px" }}>
                    {client.phone}
                  </span>
                </>
              )}
            </div>

            {/* Compliance summary */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1A1A1A]">
              {[
                { label: "TODAY", pct: client.todayPercent },
                { label: "7-DAY", pct: client.weekPercent },
                { label: "30-DAY", pct: client.monthPercent },
              ].map(({ label, pct }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[#4A3F2A]" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.06em" }}>
                    {label}
                  </span>
                  <span
                    className={`font-bold ${complianceColor(pct).text}`}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: "14px" }}
                  >
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
            {client.goal && (
              <ChangeGoalModal clientId={client.id} clientName={client.name} />
            )}
            <ArchiveClientButton clientId={client.id} clientName={client.name} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          TWO-COLUMN GRID
          ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 items-start" style={{ gap: "10px" }}>

        {/* ──────────────────────────────────────────
            LEFT COLUMN: Goal Progress + Compliance
            ────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: "10px" }}>

          {/* ── Goal Progress ──────────────────────── */}
          <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
            <SectionLabel>Goal</SectionLabel>

            {client.goal ? (
              <div className="space-y-4 mt-3">
                {/* Goal name + date */}
                <div>
                  <p
                    className="text-[#F4EEE4] font-semibold leading-snug"
                    style={{ fontFamily: "'EB Garamond', serif", fontSize: "16px" }}
                  >
                    {client.goal.goal_name}
                  </p>
                  {goalDateLabel && (
                    <p className="text-[#807868] mt-0.5" style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic" }}>
                      Target: {goalDateLabel}
                    </p>
                  )}
                </div>

                {/* Progress bar (prominent) */}
                {client.goal.goalProgress > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#807868]" style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.08em" }}>
                        PROGRESS
                      </span>
                      <span className="text-[#F4EEE4]" style={{ fontFamily: "'Cinzel', serif", fontSize: "14px", fontWeight: 700 }}>
                        {client.goal.goalProgress}%
                      </span>
                    </div>
                    <div className="h-[6px] bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progressBarColor(client.goal.goalProgress)}`}
                        style={{ width: `${Math.min(client.goal.goalProgress, 100)}%`, transition: "width 0.4s ease" }}
                      />
                    </div>
                  </div>
                )}

                {/* Category-aware metrics */}
                {client.goal.goal_category === "weight" && (
                  <MetricsRow
                    items={[
                      { label: "Start", val: client.goal.start_weight, unit: "lbs" },
                      { label: "Current", val: client.goal.current_weight, unit: "lbs" },
                      { label: "Goal", val: client.goal.goal_weight, unit: "lbs" },
                    ]}
                  />
                )}

                {client.goal.goal_category === "body_composition" && (
                  <div className="space-y-2">
                    <MetricsRow
                      items={[
                        { label: "Start BF%", val: client.goal.starting_body_fat, unit: "%" },
                        { label: "Current BF%", val: client.goal.current_body_fat, unit: "%" },
                        { label: "Goal BF%", val: client.goal.goal_body_fat, unit: "%" },
                      ]}
                    />
                    <MetricsRow
                      items={[
                        { label: "Start SMM", val: client.goal.starting_smm, unit: " lbs" },
                        { label: "Current SMM", val: client.goal.current_smm, unit: " lbs" },
                        { label: "Goal SMM", val: client.goal.goal_smm, unit: " lbs" },
                      ]}
                    />
                  </div>
                )}

                {client.goal.goal_category === "performance" && (
                  <div>
                    {client.goal.performance_metric_name && (
                      <p className="text-[#807868] mb-2" style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px" }}>
                        Metric: <span className="text-[#DDD5C0]">{client.goal.performance_metric_name}</span>
                        {client.goal.performance_unit && ` (${client.goal.performance_unit})`}
                        {client.goal.performance_direction && ` · ${client.goal.performance_direction}`}
                      </p>
                    )}
                    <MetricsRow
                      items={[
                        { label: "Start", val: client.goal.starting_performance_value, unit: client.goal.performance_unit ? ` ${client.goal.performance_unit}` : "" },
                        { label: "Current", val: client.goal.current_performance_value, unit: client.goal.performance_unit ? ` ${client.goal.performance_unit}` : "" },
                        { label: "Goal", val: client.goal.goal_performance_value, unit: client.goal.performance_unit ? ` ${client.goal.performance_unit}` : "" },
                      ]}
                    />
                  </div>
                )}

                {/* Edit metrics button */}
                <EditWeightsButton
                  goalId={client.goal.id}
                  goalCategory={client.goal.goal_category}
                  currentWeight={client.goal.current_weight}
                  goalWeight={client.goal.goal_weight}
                  currentBodyFat={client.goal.current_body_fat}
                  goalBodyFat={client.goal.goal_body_fat}
                  currentSmm={client.goal.current_smm}
                  goalSmm={client.goal.goal_smm}
                  currentPerformanceValue={client.goal.current_performance_value}
                  goalPerformanceValue={client.goal.goal_performance_value}
                />
              </div>
            ) : (
              <p className="text-[#807868] mt-3" style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", fontStyle: "italic" }}>
                No goal set yet.
              </p>
            )}
          </section>

          {/* ── Compliance ─────────────────────────── */}
          <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
            <SectionLabel>Compliance</SectionLabel>

            <div className="space-y-5 mt-3">
              {[
                { label: "Today",  pct: client.todayPercent },
                { label: "7-Day",  pct: client.weekPercent },
                { label: "30-Day", pct: client.monthPercent },
              ].map(({ label, pct }) => {
                const { bar, text } = complianceColor(pct);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#807868]" style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.08em" }}>
                        {label.toUpperCase()}
                      </span>
                      <span className={`font-bold ${text}`} style={{ fontFamily: "'Cinzel', serif", fontSize: "13px" }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-[8px] bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bar}`}
                        style={{ width: `${pct}%`, transition: "width 0.4s ease" }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-[#4A3F2A] pt-1" style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic" }}>
                Target: {COMPLIANCE_TARGET}% or better
              </p>
            </div>
          </section>
        </div>

        {/* ──────────────────────────────────────────
            RIGHT COLUMN: Health Flags + Body Metrics
            ────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: "10px" }}>

          {/* ── Health Flags ───────────────────────── */}
          <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
            <SectionLabel>Health Flags</SectionLabel>

            {client.healthFlags.length === 0 ? (
              <div className="mt-3 py-6 text-center bg-[rgba(29,158,117,0.04)] border border-[#0D3A25] rounded-[5px]">
                <p className="text-[#1D9E75]" style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em" }}>
                  ALL SYSTEMS CLEAR
                </p>
                <p className="text-[#0D3A25] mt-1" style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic" }}>
                  No health flags detected today.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 mt-3" style={{ gap: "6px" }}>
                {client.healthFlags.map((flag) => (
                  <div
                    key={flag}
                    className="flex items-center gap-2 bg-[rgba(122,30,30,0.06)] border border-[#7A1E1E] rounded px-2.5 py-2"
                  >
                    <span className="text-[#C94A4A] flex-shrink-0" style={{ fontSize: "12px" }}>
                      {healthFlagIcons[flag]}
                    </span>
                    <span
                      className="text-[#C94A4A] font-semibold truncate"
                      style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.05em" }}
                    >
                      {healthFlagLabels[flag]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Body Metrics ───────────────────────── */}
          <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
            <SectionLabel>Body Metrics</SectionLabel>

            {client.goal ? (
              <div className="mt-3 space-y-3">
                {/* Metric chips */}
                <div className="grid grid-cols-3" style={{ gap: "6px" }}>
                  {client.goal.current_weight != null && (
                    <MetricChip label="Weight" value={`${client.goal.current_weight}`} unit="lbs" />
                  )}
                  {client.goal.current_body_fat != null && (
                    <MetricChip label="Body Fat" value={`${client.goal.current_body_fat}`} unit="%" />
                  )}
                  {client.goal.current_smm != null && (
                    <MetricChip label="SMM" value={`${client.goal.current_smm}`} unit="lbs" />
                  )}
                </div>

                {/* Chart placeholder */}
                <div className="border border-[#1A1A1A] rounded-[5px] bg-[#0A0A0A] py-8 px-4 text-center">
                  <p className="text-[#4A3F2A]" style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.08em" }}>
                    WEIGHT HISTORY CHART
                  </p>
                  <p className="text-[#2A2A2A] mt-1" style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic" }}>
                    Coming soon
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[#807868] mt-3" style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", fontStyle: "italic" }}>
                No goal — no body metrics to display.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          BOTTOM: Habits + Coach Notes
          ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 items-start" style={{ gap: "10px" }}>

        {/* ── Habits ───────────────────────────────── */}
        <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Habits</SectionLabel>
            {client.goal && <AddHabitModal goalId={client.goal.id} />}
          </div>
          <HabitsTabs
            key={client.tasks.length + client.archivedTasks.length}
            active={client.tasks}
            archived={client.archivedTasks}
          />
        </section>

        {/* ── Coach Notes ──────────────────────────── */}
        <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
          <SectionLabel>Coach Notes</SectionLabel>
          <div className="mt-3">
            <ClientNotes clientId={client.id} initialNotes={client.clientNotes} />
          </div>
        </section>
      </div>

      {/* ════════════════════════════════════════════
          BEHAVIOR PATTERNS
          ════════════════════════════════════════════ */}
      <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
        <SectionLabel>Behavior Patterns</SectionLabel>
        <div className="mt-3">
          {behaviorPatterns.length === 0 ? (
            <div className="py-4 text-center">
              <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
                No behavior patterns detected. Insufficient data or client is stable.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-[9px]">
              {behaviorPatterns.map((pattern, idx) => (
                <PatternInsightCard key={`${pattern.patternType}-${idx}`} pattern={pattern} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CLIENT INTELLIGENCE TIMELINE
          ════════════════════════════════════════════ */}
      <section className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]" style={{ padding: "16px 20px" }}>
        <SectionLabel>Client Timeline</SectionLabel>
        <div className="mt-3">
          <ClientTimeline events={timelineEvents} />
        </div>
      </section>

    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[#807868] uppercase"
      style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em" }}
    >
      {children}
    </p>
  );
}

function MetricsRow({
  items,
}: {
  items: { label: string; val: number | null; unit: string }[];
}) {
  return (
    <div className="grid grid-cols-3" style={{ gap: "6px" }}>
      {items.map(({ label, val, unit }) => (
        <div key={label} className="bg-[#111111] border border-[#1A1A1A] rounded-[5px] py-2.5 px-2 text-center">
          <p className="text-[#F4EEE4] font-bold" style={{ fontFamily: "'Cinzel', serif", fontSize: "13px" }}>
            {val != null ? `${val}${unit}` : <span className="text-[#2A2A2A] font-normal" style={{ fontSize: "11px" }}>—</span>}
          </p>
          <p className="text-[#4A3F2A] mt-0.5" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.06em" }}>
            {label.toUpperCase()}
          </p>
        </div>
      ))}
    </div>
  );
}

function MetricChip({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-[5px] py-2 px-2 text-center">
      <p className="text-[#DDD5C0] font-bold" style={{ fontFamily: "'Cinzel', serif", fontSize: "13px" }}>
        {value}
        <span className="text-[#807868] font-normal ml-0.5" style={{ fontSize: "9px" }}>{unit}</span>
      </p>
      <p className="text-[#4A3F2A] mt-0.5" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", letterSpacing: "0.06em" }}>
        {label.toUpperCase()}
      </p>
    </div>
  );
}
