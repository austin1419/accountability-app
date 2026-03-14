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
import { ProgressTowardGoal }    from "@/components/ProgressTowardGoal";
import { LinkCard }              from "@/components/LinkCard";
import { BottomNav }             from "@/components/BottomNav";
import { DateHeader }            from "@/components/DateHeader";
import { DateSync }              from "@/components/DateSync";
import { SplashScreen }          from "@/components/SplashScreen";
import { fetchDashboard, fetchStatusScore } from "@/lib/server-queries";
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
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const params   = await searchParams;
  const selectedDate = validateDate(params.date, todayStr);

  // ── Fetch dashboard data ─────────────────────────────────────────
  let data: Awaited<ReturnType<typeof fetchDashboard>>;
  let statusScore: Awaited<ReturnType<typeof fetchStatusScore>>;
  try {
    [data, statusScore] = await Promise.all([
      fetchDashboard(profile.id, selectedDate),
      fetchStatusScore(profile.id, selectedDate),
    ]);
  } catch (err) {
    console.error("[ClientDashboard] fetchDashboard failed:", err);
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center max-w-md mx-auto px-5">
        <p className="text-[#9A9080] text-sm">Unable to load your dashboard. Please refresh to try again.</p>
      </div>
    );
  }

  const { clientName, goal, today } = data;

  // Short label for the compliance section header when viewing a past date
  const isToday = selectedDate === todayStr;
  const shortDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">

      <SplashScreen />

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-[#0D0D0D] pt-10 border-b border-[#252525]">
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#B8933A] mb-0.5" style={{ fontFamily: "'Cinzel', serif" }}>
              Welcome,
            </p>
            <h1
              className="text-2xl text-[#F4EEE4] tracking-wide"
              style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
            >
              {clientName}
            </h1>
          </div>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 flex-shrink-0">
            <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={1} fill="none" opacity={0.4} />
            <polyline
              style={{ filter: "drop-shadow(0 0 3px rgba(184,147,58,0.8))" }}
              points="10,50 22,50 27,50 31,34 35,66 39,50 44,50 50,22 56,50 61,50 65,40 69,60 73,50 78,50 90,50"
              stroke="#B8933A" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* Date navigation — step through days or open calendar */}
        <DateSync date={selectedDate} />
        <DateHeader userId={profile.id} />
      </header>

      {/* ── Scrollable content ───────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* ── Goal Card ────────────────────────────── */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            Your Goal
          </p>
          {goal ? (
            <div className="flex items-stretch justify-between gap-4">
              <div className="flex flex-col justify-center min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-[#B8933A] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
                  {goal.goal_category === "weight"
                    ? "Weight"
                    : goal.goal_category === "body_composition"
                    ? "Body Composition"
                    : (goal.performance_metric_name ?? "Performance")}
                </p>
                <p className="text-base font-semibold text-[#DDD5C0] leading-snug">{goal.goal_name}</p>
                {goal.goal_date && (
                  <p className="text-xs text-[#9A9080] mt-1">
                    {new Date(goal.goal_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                )}
              </div>
              {goal.goal_date && (() => {
                const daysLeft = Math.ceil(
                  (new Date(goal.goal_date + "T00:00:00").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysLeft < 0) return null;
                return (
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0"
                    style={{
                      width: 72,
                      minHeight: 72,
                      borderRadius: 8,
                      border: "1.5px solid #3A3020",
                      background: "rgba(184,147,58,0.03)",
                    }}
                  >
                    <span
                      className="text-[#D4A84B] leading-none"
                      style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 24 }}
                    >
                      {daysLeft}
                    </span>
                    <span
                      className="text-[#807868] uppercase mt-1"
                      style={{ fontFamily: "'EB Garamond', serif", fontSize: 10, letterSpacing: "0.08em" }}
                    >
                      days left
                    </span>
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-[#9A9080]">No goal set yet.</p>
          )}
        </section>

        {/* ── Progress Toward Goal ─────────────────── */}
        {goal && (
          <LinkCard href="/progress">
            <ProgressTowardGoal goal={goal} />
          </LinkCard>
        )}

        {/* ── Today's Compliance ───────────────────── */}
        <LinkCard href="/tasks">
          <section className="bg-[#141414] rounded p-5 border border-[#252525]">
            <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
              {isToday ? "Today\u2019s Compliance" : `${shortDateLabel} Compliance`}
            </p>
            {today.total === 0 ? (
              <p className="text-sm text-[#807868] italic">Add habits to begin tracking</p>
            ) : (
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
                  <p className={`text-xs font-semibold mt-2 ${
                    today.percent === 100
                      ? "text-[#4CAF50]"
                      : today.percent >= 70
                      ? "text-[#B8933A]"
                      : "text-[#7A1E1E]"
                  }`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {today.percent === 100
                      ? "Well done"
                      : today.percent >= 70
                      ? "Keep working"
                      : "Needs attention"}
                  </p>
                </div>
              </div>
            )}
          </section>
        </LinkCard>

        {/* ── Status (powered by status engine) ──── */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]" id="status-section">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>
              Status
            </p>
            {(() => {
              const s = statusScore.progressStatus;
              const cfg: Record<string, { label: string; cls: string }> = {
                ahead:    { label: "Ahead",    cls: "text-[#4CAF50] border-[#4CAF50]" },
                on_track: { label: "On Track", cls: "text-[#B8933A] border-[#B8933A]" },
                behind:   { label: "Behind",   cls: "text-[#7A1E1E] border-[#7A1E1E]" },
                no_data:  { label: "No Data",  cls: "text-[#807868] border-[#807868]" },
              };
              const c = cfg[s] ?? cfg.no_data;
              return (
                <span
                  className={`text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded border ${c.cls}`}
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {c.label}
                </span>
              );
            })()}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Compliance", value: today.total === 0 ? "—" : statusScore.complianceScore },
              { label: "Progress",   value: statusScore.progressScore },
              { label: "Overall",    value: today.total === 0 ? "—" : statusScore.overallScore },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <p className="text-sm font-bold text-[#DDD5C0]">{item.value}</p>
                <p className="text-[10px] text-[#9A9080] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[#252525]">
            <p className="text-[10px] uppercase tracking-widest text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
              Coach Eval
            </p>
            <p className="text-sm text-[#807868] italic">Coming Soon</p>
          </div>
        </section>

        {/* ── Daily Coaching Note (placeholder) ───── */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p
            className="text-xs uppercase tracking-widest text-[#9A9080] mb-3"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Coaching Note
          </p>
          <p className="text-sm text-[#807868] italic leading-relaxed">
            Your coach hasn&apos;t left a note yet.
          </p>
        </section>

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
