// ─────────────────────────────────────────────
// CLIENT DASHBOARD — connected to Supabase
//
// This is a Server Component (no "use client" directive).
// In Next.js App Router, server components can be async — they fetch
// data before rendering, so the page arrives fully populated.
// No loading spinners, no useEffect, no useState needed here.
// ─────────────────────────────────────────────

import { ProgressRing }   from "@/components/ProgressRing";
import { BottomNav }      from "@/components/BottomNav";
import { fetchDashboard } from "@/lib/queries";
import { DEMO_CLIENT_ID } from "@/lib/config";

// Calculates how far along the client is toward their goal weight.
// Returns 0 if any weight value is missing.
function getGoalProgress(
  start:   number | null,
  current: number | null,
  goal:    number | null
): number {
  if (start == null || current == null || goal == null) return 0;
  const totalToLose = start - goal;
  if (totalToLose <= 0) return 0;
  const lostSoFar = start - current;
  return Math.min(Math.max(Math.round((lostSoFar / totalToLose) * 100), 0), 100);
}

export default async function ClientDashboard() {
  // Fetch all dashboard data from Supabase before the page renders.
  // DEMO_CLIENT_ID is a fixed UUID from seed.sql — replaced by real auth later.
  const data = await fetchDashboard(DEMO_CLIENT_ID);

  const { clientName, goal, today, week } = data;

  const goalProgress = getGoalProgress(
    goal?.start_weight ?? null,
    goal?.current_weight ?? null,
    goal?.goal_weight ?? null
  );

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-white px-5 pt-10 pb-5 border-b border-gray-100">
        <p className="text-sm text-gray-400">{todayDate}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Hey, {clientName} 👋
        </h1>
      </header>

      {/* ── Scrollable content ───────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* ── Goal Card ────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Your Goal
          </p>
          {goal ? (
            <>
              <p className="text-base font-semibold text-gray-800 leading-snug">
                {goal.goal_name}
              </p>
              {goal.start_weight != null && goal.current_weight != null && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                  <span>
                    Started at <strong className="text-gray-700">{goal.start_weight} lbs</strong>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>
                    Currently <strong className="text-gray-700">{goal.current_weight} lbs</strong>
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">No goal set yet.</p>
          )}
        </section>

        {/* ── Progress Toward Goal ─────────────────── */}
        {goal?.start_weight != null && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Progress Toward Goal
            </p>
            <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <ProgressRing percent={goalProgress} color="#3b82f6" />
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-gray-900">{goalProgress}%</span>
                  <span className="text-xs text-gray-400">complete</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-400">Lost so far</p>
                  <p className="text-lg font-bold text-gray-800">
                    {((goal.start_weight ?? 0) - (goal.current_weight ?? 0)).toFixed(1)} lbs
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Still to go</p>
                  <p className="text-lg font-bold text-gray-800">
                    {((goal.current_weight ?? 0) - (goal.goal_weight ?? 0)).toFixed(1)} lbs
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Today's Compliance ───────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Today&apos;s Compliance
          </p>
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <ProgressRing
                percent={today.percent}
                color={today.percent >= 70 ? "#22c55e" : "#f59e0b"}
              />
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-gray-900">{today.percent}%</span>
                <span className="text-xs text-gray-400">done</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-500">
                <strong className="text-gray-800">{today.completed}</strong> of{" "}
                <strong className="text-gray-800">{today.total}</strong> tasks complete
              </p>
              <p className="text-xs text-gray-400 mt-1">Target: 70% or better</p>
              {today.percent >= 70 ? (
                <span className="mt-2 inline-block text-xs font-semibold text-green-600 bg-green-50 rounded-full px-3 py-1">
                  On track
                </span>
              ) : (
                <span className="mt-2 inline-block text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-3 py-1">
                  Needs attention
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Weekly Compliance ────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Weekly Compliance
            </p>
            {week.percent >= 70 ? (
              <span className="text-xs font-semibold text-green-600 bg-green-50 rounded-full px-3 py-1">
                On track
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-3 py-1">
                Needs attention
              </span>
            )}
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-3">
            {week.percent}
            <span className="text-2xl text-gray-400">%</span>
          </p>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                week.percent >= 70 ? "bg-green-500" : "bg-amber-400"
              }`}
              style={{ width: `${week.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">Target: 70% or better</p>
        </section>

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
