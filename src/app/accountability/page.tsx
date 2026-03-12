// ─────────────────────────────────────────────
// ACCOUNTABILITY — Group leaderboard
//
// Shows every client's weekly compliance, today's status, and goal progress
// so the whole group can cheer each other on. Inspired by WHOOP's strain groups.
//
// Server Component: fetches all data before render, no loading spinners needed.
// ─────────────────────────────────────────────

import { redirect }              from "next/navigation";
import { BottomNav }             from "@/components/BottomNav";
import { fetchLeaderboard }      from "@/lib/server-queries";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }     from "@/lib/supabase-admin";

// ── Medal colors for top 3 ─────────────────────
const rankStyles: Record<number, { border: string; badge: string; label: string }> = {
  1: { border: "border-[#B8933A]", badge: "bg-[#1A1A1A] text-[#B8933A]", label: "1" },
  2: { border: "border-[#9A9080]", badge: "bg-[#1A1A1A] text-[#9A9080]", label: "2" },
  3: { border: "border-[#7A7060]", badge: "bg-[#1A1A1A] text-[#7A7060]", label: "3" },
};

export default async function AccountabilityPage() {
  // ── Auth check ───────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const leaderboard = await fetchLeaderboard();

  // Group average weekly compliance
  const groupAvg =
    leaderboard.length > 0
      ? Math.round(
          leaderboard.reduce((sum, e) => sum + e.weekPercent, 0) / leaderboard.length
        )
      : 0;

  const groupOnTrack = leaderboard.filter((e) => e.weekPercent >= 70).length;

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-[#0D0D0D] px-5 pt-10 pb-5 border-b border-[#252525]">
        <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>
          Group Accountability
        </p>
        <h1 className="text-2xl text-[#F4EEE4] mt-1 tracking-wide" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>
          How&apos;s everyone doing?
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* ── Group summary card ────────────────────── */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
            This week&apos;s group stats
          </p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-4xl font-bold text-[#DDD5C0]">
                {groupAvg}
                <span className="text-2xl text-[#9A9080]">%</span>
              </p>
              <p className="text-xs text-[#9A9080] mt-0.5">Group compliance</p>
            </div>
            <div className="h-10 w-px bg-[#252525]" />
            <div>
              <p className="text-4xl font-bold text-[#DDD5C0]">{groupOnTrack}</p>
              <p className="text-xs text-[#9A9080] mt-0.5">
                of {leaderboard.length} on track
              </p>
            </div>
          </div>

          {/* Group compliance bar */}
          <div className="mt-4 h-2 bg-[#252525] rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-500 ${
                groupAvg >= 70 ? "bg-[#B8933A]" : "bg-[#7A1E1E]"
              }`}
              style={{ width: `${groupAvg}%` }}
            />
          </div>
          <p className="text-xs text-[#807868] mt-1.5">Target: 70% or better</p>
        </section>

        {/* ── Leaderboard ───────────────────────────── */}
        <section>
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-3 px-1" style={{ fontFamily: "'Cinzel', serif" }}>
            Weekly Leaderboard
          </p>

          {leaderboard.length === 0 ? (
            <div className="bg-[#141414] rounded p-5 border border-[#252525] text-center">
              <p className="text-sm text-[#9A9080]">No clients yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {leaderboard.map((entry, index) => {
                const rank    = index + 1;
                const isYou   = entry.id === profile.id;
                const style   = rankStyles[rank];
                const onTrack = entry.weekPercent >= 70;

                return (
                  <li
                    key={entry.id}
                    className={`bg-[#141414] rounded p-4 border ${
                      isYou
                        ? "border-[#B8933A]"
                        : style
                        ? style.border
                        : "border-[#252525]"
                    }`}
                  >
                    {/* ── Top row: rank, name, week % ── */}
                    <div className="flex items-center gap-3">

                      {/* Rank badge */}
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                          style ? style.badge : "bg-[#1A1A1A] text-[#807868]"
                        }`}
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        {style ? style.label : rank}
                      </div>

                      {/* Name + "You" tag */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#DDD5C0] truncate">
                            {entry.name}
                          </p>
                          {isYou && (
                            <span className="text-xs font-semibold text-[#B8933A] bg-[#1A1A1A] border border-[#B8933A] rounded px-2 py-0.5 flex-shrink-0" style={{ fontFamily: "'Cinzel', serif" }}>
                              You
                            </span>
                          )}
                        </div>
                        {entry.goalName && (
                          <p className="text-xs text-[#9A9080] truncate mt-0.5">
                            {entry.goalName}
                          </p>
                        )}
                      </div>

                      {/* Weekly compliance number */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-2xl font-bold ${
                            onTrack ? "text-[#B8933A]" : "text-[#7A1E1E]"
                          }`}
                        >
                          {entry.weekPercent}
                          <span className="text-base font-medium">%</span>
                        </p>
                        <p className="text-xs text-[#9A9080]">this week</p>
                      </div>
                    </div>

                    {/* ── Weekly compliance bar ── */}
                    <div className="mt-3 h-1.5 bg-[#252525] rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-500 ${
                          onTrack ? "bg-[#B8933A]" : "bg-[#7A1E1E]"
                        }`}
                        style={{ width: `${entry.weekPercent}%` }}
                      />
                    </div>

                    {/* ── Bottom row: today's status + goal progress ── */}
                    <div className="mt-3 flex items-center justify-between">

                      {/* Today's badge */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                            entry.todayPercent >= 70
                              ? "text-[#B8933A] border-[#B8933A]"
                              : entry.todayPercent > 0
                              ? "text-[#7A1E1E] border-[#7A1E1E]"
                              : "text-[#807868] border-[#252525]"
                          }`}
                          style={{ fontFamily: "'Cinzel', serif" }}
                        >
                          {entry.todayPercent >= 70
                            ? "On track today"
                            : entry.todayPercent > 0
                            ? `${entry.todayPercent}% today`
                            : "Not started today"}
                        </span>
                      </div>

                      {/* Goal progress */}
                      {entry.goalProgress > 0 && (
                        <span className="text-xs text-[#9A9080]">
                          Goal{" "}
                          <strong className="text-[#DDD5C0]">{entry.goalProgress}%</strong>{" "}
                          complete
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Motivational footer ───────────────────── */}
        <p className="text-center text-xs text-[#807868] pb-2">
          Updated every time you check in
        </p>

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
