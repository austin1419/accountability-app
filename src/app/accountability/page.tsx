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
  1: { border: "border-amber-300",  badge: "bg-amber-100 text-amber-700",  label: "🥇" },
  2: { border: "border-gray-300",   badge: "bg-gray-100  text-gray-600",   label: "🥈" },
  3: { border: "border-orange-300", badge: "bg-orange-100 text-orange-700", label: "🥉" },
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
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-white px-5 pt-10 pb-5 border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Group Accountability
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          How&apos;s everyone doing?
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* ── Group summary card ────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            This week&apos;s group stats
          </p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-4xl font-bold text-gray-900">
                {groupAvg}
                <span className="text-2xl text-gray-400">%</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Group compliance</p>
            </div>
            <div className="h-10 w-px bg-gray-100" />
            <div>
              <p className="text-4xl font-bold text-gray-900">{groupOnTrack}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                of {leaderboard.length} on track
              </p>
            </div>
          </div>

          {/* Group compliance bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                groupAvg >= 70 ? "bg-green-500" : "bg-amber-400"
              }`}
              style={{ width: `${groupAvg}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Target: 70% or better</p>
        </section>

        {/* ── Leaderboard ───────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">
            Weekly Leaderboard
          </p>

          {leaderboard.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <p className="text-sm text-gray-400">No clients yet.</p>
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
                    className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${
                      isYou
                        ? "border-blue-400"
                        : style
                        ? style.border
                        : "border-gray-100"
                    }`}
                  >
                    {/* ── Top row: rank, name, week % ── */}
                    <div className="flex items-center gap-3">

                      {/* Rank badge */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                          style ? style.badge : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {style ? style.label : rank}
                      </div>

                      {/* Name + "You" tag */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {entry.name}
                          </p>
                          {isYou && (
                            <span className="text-xs font-semibold text-blue-500 bg-blue-50 rounded-full px-2 py-0.5 flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        {entry.goalName && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {entry.goalName}
                          </p>
                        )}
                      </div>

                      {/* Weekly compliance number */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-2xl font-bold ${
                            onTrack ? "text-green-600" : "text-amber-500"
                          }`}
                        >
                          {entry.weekPercent}
                          <span className="text-base font-medium">%</span>
                        </p>
                        <p className="text-xs text-gray-400">this week</p>
                      </div>
                    </div>

                    {/* ── Weekly compliance bar ── */}
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          onTrack ? "bg-green-500" : "bg-amber-400"
                        }`}
                        style={{ width: `${entry.weekPercent}%` }}
                      />
                    </div>

                    {/* ── Bottom row: today's status + goal progress ── */}
                    <div className="mt-3 flex items-center justify-between">

                      {/* Today's badge */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            entry.todayPercent >= 70
                              ? "bg-green-50 text-green-600"
                              : entry.todayPercent > 0
                              ? "bg-amber-50 text-amber-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
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
                        <span className="text-xs text-gray-500">
                          Goal{" "}
                          <strong className="text-gray-700">{entry.goalProgress}%</strong>{" "}
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
        <p className="text-center text-xs text-gray-300 pb-2">
          Updated every time you check in
        </p>

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
