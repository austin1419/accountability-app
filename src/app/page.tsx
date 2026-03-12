// ─────────────────────────────────────────────
// CLIENT DASHBOARD — connected to Supabase
//
// This is a Server Component (no "use client" directive).
// In Next.js App Router, server components can be async — they fetch
// data before rendering, so the page arrives fully populated.
// No loading spinners, no useEffect, no useState needed here.
// ─────────────────────────────────────────────

import { redirect }              from "next/navigation";
import { ProgressRing }          from "@/components/ProgressRing";
import { BottomNav }             from "@/components/BottomNav";
import { DateHeader }            from "@/components/DateHeader";
import { fetchDashboard }        from "@/lib/server-queries";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }     from "@/lib/supabase-admin";

// Always render fresh from the server — required so searchParams-driven
// date navigation actually re-fetches Supabase data on each navigation.
export const dynamic = "force-dynamic";

// Validates a raw date string from the URL.
// Returns todayStr for any missing, malformed, or future value.
function validateDate(raw: string | undefined, todayStr: string): string {
  if (!raw) return todayStr;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return todayStr;
  const d = new Date(raw + "T00:00:00");
  if (isNaN(d.getTime())) return todayStr;
  if (raw > todayStr) return todayStr; // clamp future dates to today
  return raw;
}

export default async function ClientDashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  // ── Auth check ───────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Look up the user's public.users row (the id used in all data tables)
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // ── Date handling ────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const params   = await searchParams;
  const selectedDate = validateDate(params.date, todayStr);

  // ── Fetch dashboard data ─────────────────────────────────────────
  let data: Awaited<ReturnType<typeof fetchDashboard>>;
  try {
    data = await fetchDashboard(profile.id, selectedDate);
  } catch (err) {
    console.error("[ClientDashboard] fetchDashboard failed:", err);
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center max-w-md mx-auto px-5">
        <p className="text-[#9A9080] text-sm">Unable to load your dashboard. Please refresh to try again.</p>
      </div>
    );
  }

  const { clientName, goal, today, week } = data;

  const goalProgress = goal?.goalProgress ?? 0;

  // Friendly greeting date — always shows real today
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  // Short label for the compliance section header when viewing a past date
  const isToday = selectedDate === todayStr;
  const shortDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-[#0D0D0D] pt-10 border-b border-[#252525]">
        <div className="px-5 pb-3">
          {/* Brand mark */}
          <div className="mb-3 flex items-center gap-2">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0">
              <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={1} fill="none" opacity={0.4} />
              <polyline
                style={{ filter: "drop-shadow(0 0 3px rgba(184,147,58,0.8))" }}
                points="10,50 22,50 27,50 31,34 35,66 39,50 44,50 50,22 56,50 61,50 65,40 69,60 73,50 78,50 90,50"
                stroke="#B8933A" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            <div>
              <p
                className="text-xs tracking-[0.3em] text-[#B8933A] uppercase leading-none"
                style={{ fontFamily: "'Cinzel', serif", fontWeight: 900 }}
              >
                PULSE
              </p>
              <p
                className="text-[10px] text-[#807868] mt-0.5 leading-none"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
              >
                Most apps track what you do. PULSE tracks who you&apos;re becoming.
              </p>
            </div>
          </div>
          <p className="text-sm text-[#9A9080]">{todayDate}</p>
          <h1
            className="text-2xl text-[#F4EEE4] mt-1 tracking-wide"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
          >
            {clientName}
          </h1>
        </div>
        {/* Date navigation — step through days or open calendar */}
        <DateHeader selectedDate={selectedDate} todayDate={todayStr} userId={profile.id} />
      </header>

      {/* ── Scrollable content ───────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* ── Goal Card ────────────────────────────── */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
            Your Goal
          </p>
          {goal ? (
            <>
              <p className="text-base font-semibold text-[#DDD5C0] leading-snug">
                {goal.goal_name}
              </p>
              {goal.goal_category === "weight" && goal.start_weight != null && goal.current_weight != null && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#9A9080] flex-wrap">
                  <span>Started at <strong className="text-[#DDD5C0]">{goal.start_weight} lbs</strong></span>
                  <span className="text-[#252525]">·</span>
                  <span>Currently <strong className="text-[#DDD5C0]">{goal.current_weight} lbs</strong></span>
                </div>
              )}
              {goal.goal_category === "body_composition" && goal.current_body_fat != null && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#9A9080] flex-wrap">
                  <span>Body fat: <strong className="text-[#DDD5C0]">{goal.current_body_fat}%</strong></span>
                  {goal.current_smm != null && (
                    <>
                      <span className="text-[#252525]">·</span>
                      <span>SMM: <strong className="text-[#DDD5C0]">{goal.current_smm} lbs</strong></span>
                    </>
                  )}
                </div>
              )}
              {goal.goal_category === "performance" && goal.current_performance_value != null && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#9A9080] flex-wrap">
                  <span>
                    {goal.performance_metric_name ?? "Current"}:{" "}
                    <strong className="text-[#DDD5C0]">
                      {goal.current_performance_value}{goal.performance_unit ? ` ${goal.performance_unit}` : ""}
                    </strong>
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#9A9080]">No goal set yet.</p>
          )}
        </section>

        {/* ── Progress Toward Goal ─────────────────── */}
        {goal && (
          <section className="bg-[#141414] rounded p-5 border border-[#252525]">
            <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
              Progress Toward Goal
            </p>
            <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <ProgressRing percent={goalProgress} color="#B8933A" />
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-[#DDD5C0]">{goalProgress}%</span>
                  <span className="text-xs text-[#9A9080]">complete</span>
                </div>
              </div>

              {/* Weight details */}
              {goal.goal_category === "weight" && goal.start_weight != null && goal.current_weight != null && (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-[#9A9080]">Lost so far</p>
                    <p className="text-lg font-bold text-[#B8933A]">
                      {((goal.start_weight ?? 0) - (goal.current_weight ?? 0)).toFixed(1)} lbs
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9A9080]">Still to go</p>
                    <p className="text-lg font-bold text-[#DDD5C0]">
                      {((goal.current_weight ?? 0) - (goal.goal_weight ?? 0)).toFixed(1)} lbs
                    </p>
                  </div>
                </div>
              )}

              {/* Body composition details */}
              {goal.goal_category === "body_composition" && (
                <div className="flex flex-col gap-3">
                  {goal.current_body_fat != null && goal.goal_body_fat != null && (
                    <div>
                      <p className="text-xs text-[#9A9080]">Body fat</p>
                      <p className="text-base font-bold text-[#DDD5C0]">
                        {goal.current_body_fat}% → {goal.goal_body_fat}%
                      </p>
                    </div>
                  )}
                  {goal.current_smm != null && goal.goal_smm != null && (
                    <div>
                      <p className="text-xs text-[#9A9080]">Muscle (SMM)</p>
                      <p className="text-base font-bold text-[#DDD5C0]">
                        {goal.current_smm} → {goal.goal_smm} lbs
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Performance details */}
              {goal.goal_category === "performance" && (
                <div className="flex flex-col gap-3">
                  {goal.current_performance_value != null && (
                    <div>
                      <p className="text-xs text-[#9A9080]">
                        {goal.performance_metric_name ?? "Current"}
                      </p>
                      <p className="text-lg font-bold text-[#DDD5C0]">
                        {goal.current_performance_value}
                        {goal.performance_unit ? ` ${goal.performance_unit}` : ""}
                      </p>
                    </div>
                  )}
                  {goal.goal_performance_value != null && (
                    <div>
                      <p className="text-xs text-[#9A9080]">Goal</p>
                      <p className="text-lg font-bold text-[#DDD5C0]">
                        {goal.goal_performance_value}
                        {goal.performance_unit ? ` ${goal.performance_unit}` : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>
        )}

        {/* ── Today's Compliance ───────────────────── */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
            {isToday ? "Today\u2019s Compliance" : `${shortDateLabel} Compliance`}
          </p>
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <ProgressRing
                percent={today.percent}
                color={today.percent >= 70 ? "#B8933A" : "#7A1E1E"}
              />
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-[#DDD5C0]">{today.percent}%</span>
                <span className="text-xs text-[#9A9080]">done</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-[#9A9080]">
                <strong className="text-[#DDD5C0]">{today.completed}</strong> of{" "}
                <strong className="text-[#DDD5C0]">{today.total}</strong> tasks complete
              </p>
              <p className="text-xs text-[#807868] mt-1">Target: 70% or better</p>
              {today.percent >= 70 ? (
                <span className="mt-2 inline-block text-xs font-semibold text-[#B8933A] border border-[#B8933A] rounded px-3 py-1" style={{ fontFamily: "'Cinzel', serif" }}>
                  On track
                </span>
              ) : (
                <span className="mt-2 inline-block text-xs font-semibold text-[#7A1E1E] border border-[#7A1E1E] rounded px-3 py-1" style={{ fontFamily: "'Cinzel', serif" }}>
                  Needs attention
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Weekly Compliance ────────────────────── */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>
              {isToday ? "Weekly Compliance" : `7 Days to ${shortDateLabel}`}
            </p>
            {week.percent >= 70 ? (
              <span className="text-xs font-semibold text-[#B8933A] border border-[#B8933A] rounded px-3 py-1" style={{ fontFamily: "'Cinzel', serif" }}>
                On track
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#7A1E1E] border border-[#7A1E1E] rounded px-3 py-1" style={{ fontFamily: "'Cinzel', serif" }}>
                Needs attention
              </span>
            )}
          </div>
          <p className="text-4xl font-bold text-[#DDD5C0] mb-3">
            {week.percent}
            <span className="text-2xl text-[#9A9080]">%</span>
          </p>
          <div className="h-1.5 bg-[#252525] rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-500 ${
                week.percent >= 70 ? "bg-[#B8933A]" : "bg-[#7A1E1E]"
              }`}
              style={{ width: `${week.percent}%` }}
            />
          </div>
          <p className="text-xs text-[#807868] mt-2">Target: 70% or better</p>
        </section>

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
