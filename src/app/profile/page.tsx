// ─────────────────────────────────────────────
// PROFILE PAGE — Server Component
//
// Fetches name + created_at from users and the active goal.
// Passes pre-computed values to presentational components.
// ─────────────────────────────────────────────

import { redirect }                   from "next/navigation";
import { BottomNav }                  from "@/components/BottomNav";
import { ProfileHeader }              from "@/components/profile/ProfileHeader";
import { GoalCard }                   from "@/components/profile/GoalCard";
import { ComplianceSection }          from "@/components/profile/ComplianceSection";
import { CoachingProfileCard }        from "@/components/profile/CoachingProfileCard";
import { AchievementsCard }           from "@/components/profile/AchievementsCard";
import { BadgesCard }                 from "@/components/profile/BadgesCard";
import { SignOutButton }              from "@/components/SignOutButton";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }          from "@/lib/supabase-admin";
import { fetchProfileCompliance }     from "@/lib/server-queries";
import type { GoalMetrics }           from "@/lib/server-queries";

export const dynamic = "force-dynamic";

// computeGoalProgress is not exported from server-queries — inlined here.
function computeGoalProgress(g: GoalMetrics): number {
  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);

  if (g.goal_category === "body_composition") {
    const parts: number[] = [];
    if (g.starting_body_fat != null && g.current_body_fat != null && g.goal_body_fat != null
        && g.starting_body_fat - g.goal_body_fat > 0)
      parts.push(clamp(((g.starting_body_fat - g.current_body_fat) / (g.starting_body_fat - g.goal_body_fat)) * 100));
    if (g.starting_smm != null && g.current_smm != null && g.goal_smm != null
        && g.goal_smm - g.starting_smm > 0)
      parts.push(clamp(((g.current_smm - g.starting_smm) / (g.goal_smm - g.starting_smm)) * 100));
    return parts.length === 0 ? 0 : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  if (g.goal_category === "performance") {
    const { performance_direction: dir, starting_performance_value: s,
            current_performance_value: c, goal_performance_value: goal } = g;
    if (s == null || c == null || goal == null || dir == null) return 0;
    if (dir === "increase") return goal - s <= 0 ? 0 : clamp(((c - s) / (goal - s)) * 100);
    return s - goal <= 0 ? 0 : clamp(((s - c) / (s - goal)) * 100);
  }

  const { start_weight: s, current_weight: c, goal_weight: goal } = g;
  if (s == null || c == null || goal == null || s - goal <= 0) return 0;
  return clamp(((s - c) / (s - goal)) * 100);
}


export default async function ProfilePage() {
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

  // ── Fetch user row ────────────────────────────────────────────────
  const { data: userData } = await adminSupabase
    .from("users")
    .select("name, created_at")
    .eq("id", profile.id)
    .maybeSingle();

  // ── Fetch active goal ─────────────────────────────────────────────
  const { data: goalData } = await adminSupabase
    .from("goals")
    .select("goal_name, goal_category, goal_date, start_weight, goal_weight, current_weight, starting_body_fat, current_body_fat, goal_body_fat, starting_smm, current_smm, goal_smm, performance_metric_name, performance_unit, performance_direction, starting_performance_value, current_performance_value, goal_performance_value")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();

  // ── Derived values ────────────────────────────────────────────────
  const clientName = userData?.name ?? "—";
  const startDate  = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  const goalProgress = goalData ? computeGoalProgress(goalData as GoalMetrics) : 0;

  // Fetch compliance data for the profile
  const compliance = await fetchProfileCompliance(profile.id);

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">

      <ProfileHeader name={clientName} startDate={startDate} />

      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <GoalCard
          goalName={goalData?.goal_name ?? null}
          progress={goalProgress}
        />

        <ComplianceSection
          weekPercent={compliance.weekPercent}
          monthPercent={compliance.monthPercent}
          overallPercent={compliance.overallPercent}
        />

        <CoachingProfileCard />

        <AchievementsCard />

        <BadgesCard />

        <SignOutButton
          className="mt-4 w-full py-3 rounded bg-[#7A1E1E] text-sm font-semibold text-[#F4EEE4] hover:bg-[#8B2222] active:bg-[#6A1A1A] transition-colors mb-2"
        >
          Logout
        </SignOutButton>
      </main>

      <BottomNav />

    </div>
  );
}
