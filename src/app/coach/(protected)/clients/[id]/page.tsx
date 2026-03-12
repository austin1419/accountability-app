// ─────────────────────────────────────────────
// COACH — Client Detail
//
// Profile view for a single client. Shows contact info,
// goal, compliance metrics, and assigned habits.
// This is the destination of every "View →" link in the coach portal.
//
// Server Component — desktop-first layout.
// ─────────────────────────────────────────────

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchClientDetail } from "@/lib/server-queries";
import { AddHabitModal } from "./AddHabitModal";
import { HabitsTabs } from "./HabitsTabs";
import { EditWeightsButton } from "./EditWeightsButton";
import { ClientNotes } from "./ClientNotes";
import { ArchiveClientButton } from "./ArchiveClientButton";

export const dynamic = "force-dynamic";

function ComplianceBar({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= 70 ? "bg-[#B8933A]" :
    pct >= 50 ? "bg-[#C9A44A]" :
                "bg-[#7A1E1E]";
  const text =
    pct >= 70 ? "text-[#B8933A]" :
    pct >= 50 ? "text-[#C9A44A]" :
                "text-[#7A1E1E]";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-[#9A9080]">{label}</span>
        <span className={`text-sm font-bold ${text}`}>{pct}%</span>
      </div>
      <div className="h-2 bg-[#252525] rounded overflow-hidden">
        <div className={`h-full rounded transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await fetchClientDetail(id);

  if (!client) notFound();

  const isOnTrack =
    client.todayPercent >= 70 &&
    client.weekPercent  >= 70 &&
    client.monthPercent >= 70;

  const goalDateLabel = client.goal?.goal_date
    ? new Date(client.goal.goal_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day:   "numeric",
        year:  "numeric",
      })
    : null;

  return (
    <div className="space-y-6">

      {/* ── Back link ───────────────────────────── */}
      <Link
        href="/coach/clients"
        className="inline-flex items-center gap-1 text-sm text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-3 py-1.5 rounded cursor-pointer transition-all duration-150"
      >
        ← Back to Clients
      </Link>

      {/* ── Profile header ──────────────────────── */}
      <div className="bg-[#141414] rounded border border-[#252525] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl text-[#F4EEE4] tracking-wide" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>{client.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#9A9080]">
              <span>{client.email}</span>
              {client.phone && (
                <>
                  <span className="text-[#252525]">·</span>
                  <span>{client.phone}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded border ${
                isOnTrack
                  ? "text-[#B8933A] border-[#B8933A]"
                  : "text-[#7A1E1E] border-[#7A1E1E]"
              }`}
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {isOnTrack ? "On track" : "Needs attention"}
            </span>
            <ArchiveClientButton clientId={client.id} clientName={client.name} />
          </div>
        </div>
      </div>

      {/* ── Two-column: Goal + Compliance ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Goal card */}
        <div className="bg-[#141414] rounded border border-[#252525] p-6 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>
            Goal
          </p>

          {client.goal ? (
            <>
              <p className="text-lg font-semibold text-[#F4EEE4] leading-snug">
                {client.goal.goal_name}
              </p>

              {goalDateLabel && (
                <p className="text-sm text-[#9A9080]">
                  Target date:{" "}
                  <strong className="text-[#DDD5C0] font-medium">{goalDateLabel}</strong>
                </p>
              )}

              {client.goal.goalProgress > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#9A9080]">Progress toward goal</span>
                    <span className="text-xs font-semibold text-[#DDD5C0]">
                      {client.goal.goalProgress}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#252525] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#B8933A] rounded"
                      style={{ width: `${client.goal.goalProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Category-aware metrics */}
              {client.goal && (
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
              )}

              {/* Weight */}
              {client.goal.goal_category === "weight" && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Starting", val: client.goal.start_weight,   unit: "lbs" },
                    { label: "Current",  val: client.goal.current_weight, unit: "lbs" },
                    { label: "Goal",     val: client.goal.goal_weight,    unit: "lbs" },
                  ].map(({ label, val, unit }) => (
                    <div key={label} className="bg-[#1A1A1A] rounded p-3 text-center">
                      <p className="text-base font-bold text-[#DDD5C0]">
                        {val != null ? `${val} ${unit}` : <span className="text-[#2E2E2E] text-sm font-normal">—</span>}
                      </p>
                      <p className="text-xs text-[#9A9080] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Body composition */}
              {client.goal.goal_category === "body_composition" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Starting BF%", val: client.goal.starting_body_fat, unit: "%" },
                      { label: "Current BF%",  val: client.goal.current_body_fat,  unit: "%" },
                      { label: "Goal BF%",     val: client.goal.goal_body_fat,     unit: "%" },
                    ].map(({ label, val, unit }) => (
                      <div key={label} className="bg-[#1A1A1A] rounded p-3 text-center">
                        <p className="text-base font-bold text-[#DDD5C0]">
                          {val != null ? `${val}${unit}` : <span className="text-[#2E2E2E] text-sm font-normal">—</span>}
                        </p>
                        <p className="text-xs text-[#9A9080] mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Starting SMM", val: client.goal.starting_smm, unit: " lbs" },
                      { label: "Current SMM",  val: client.goal.current_smm,  unit: " lbs" },
                      { label: "Goal SMM",     val: client.goal.goal_smm,     unit: " lbs" },
                    ].map(({ label, val, unit }) => (
                      <div key={label} className="bg-[#1A1A1A] rounded p-3 text-center">
                        <p className="text-base font-bold text-[#DDD5C0]">
                          {val != null ? `${val}${unit}` : <span className="text-[#2E2E2E] text-sm font-normal">—</span>}
                        </p>
                        <p className="text-xs text-[#9A9080] mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance */}
              {client.goal.goal_category === "performance" && (
                <div>
                  {client.goal.performance_metric_name && (
                    <p className="text-xs text-[#9A9080] mb-2">
                      Metric: <strong className="text-[#DDD5C0] font-medium">{client.goal.performance_metric_name}</strong>
                      {client.goal.performance_unit && ` (${client.goal.performance_unit})`}
                      {client.goal.performance_direction && ` · ${client.goal.performance_direction}`}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Starting", val: client.goal.starting_performance_value },
                      { label: "Current",  val: client.goal.current_performance_value  },
                      { label: "Goal",     val: client.goal.goal_performance_value     },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-[#1A1A1A] rounded p-3 text-center">
                        <p className="text-base font-bold text-[#DDD5C0]">
                          {val != null
                            ? `${val}${client.goal?.performance_unit ? ` ${client.goal.performance_unit}` : ""}`
                            : <span className="text-[#2E2E2E] text-sm font-normal">—</span>}
                        </p>
                        <p className="text-xs text-[#9A9080] mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#9A9080]">No goal set yet.</p>
          )}
        </div>

        {/* Compliance card */}
        <div className="bg-[#141414] rounded border border-[#252525] p-6 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>
            Compliance
          </p>

          <div className="space-y-4">
            <ComplianceBar label="Today"  pct={client.todayPercent} />
            <ComplianceBar label="7-Day"  pct={client.weekPercent}  />
            <ComplianceBar label="30-Day" pct={client.monthPercent} />
          </div>

          <p className="text-xs text-[#807868]">Target: 70% or better</p>
        </div>

      </div>

      {/* ── Habits (active + archived tabs) ─────── */}
      <div className="bg-[#141414] rounded border border-[#252525] p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>
            Habits
          </p>
          {client.goal && <AddHabitModal goalId={client.goal.id} />}
        </div>
        <HabitsTabs
          key={client.tasks.length + client.archivedTasks.length}
          active={client.tasks}
          archived={client.archivedTasks}
        />
      </div>

      {/* ── Coach Notes ──────────────────────────── */}
      <div className="bg-[#141414] rounded border border-[#252525] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9A9080] mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
          Coach Notes
        </p>
        <ClientNotes clientId={client.id} initialNotes={client.clientNotes} />
      </div>

    </div>
  );
}
