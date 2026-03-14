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
import { CoachingProfilePanel }        from "@/components/profile/CoachingProfilePanel";
import { AchievementsCard }           from "@/components/profile/AchievementsCard";
import { BadgesCard }                 from "@/components/profile/BadgesCard";
import { SignOutButton }              from "@/components/SignOutButton";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }          from "@/lib/supabase-admin";
import { fetchProfileCompliance }     from "@/lib/server-queries";
import { computeGoalProgress }        from "@/lib/computeGoalProgress";
import type { GoalMetrics }           from "@/lib/computeGoalProgress";

export const dynamic = "force-dynamic";

// Shared inline styles
const sectionLabel: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.2em", color: "#4A3F2A", textTransform: "uppercase",
  marginBottom: 8,
};
const divider: React.CSSProperties = {
  height: 1, background: "#1A1A1A", margin: "14px 0",
};

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
    .select("name, created_at, gender, date_of_birth, height")
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

  // Compute age from date_of_birth
  let age: number | null = null;
  if (userData?.date_of_birth) {
    const dob = new Date(userData.date_of_birth + "T00:00:00");
    const now = new Date();
    age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
  }

  const goalProgress = goalData ? computeGoalProgress(goalData as GoalMetrics) : 0;

  // Fetch compliance data for the profile
  const compliance = await fetchProfileCompliance(profile.id);

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col max-w-md mx-auto">

      <ProfileHeader
        name={clientName}
        startDate={startDate}
        gender={userData?.gender ?? null}
        age={age}
      />

      <main style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── Current Goal ── */}
        <p style={sectionLabel}>Current Goal</p>
        <GoalCard
          goalName={goalData?.goal_name ?? null}
          progress={goalProgress}
        />

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── Compliance ── */}
        <p style={sectionLabel}>Compliance</p>
        <ComplianceSection
          weekPercent={compliance.weekPercent}
          monthPercent={compliance.monthPercent}
          overallPercent={compliance.overallPercent}
        />

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── Coaching Profile ── */}
        <p style={sectionLabel}>Coaching Profile</p>
        <CoachingProfilePanel />

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── Achievements ── */}
        <p style={sectionLabel}>Achievements</p>
        <AchievementsCard />

        {/* ── 8px spacer ── */}
        <div style={{ height: 8 }} />

        {/* ── Badges ── */}
        <p style={sectionLabel}>Badges</p>
        <BadgesCard />

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── Logout ── */}
        <SignOutButton
          className=""
          style={{
            width: "100%", background: "#7A1E1E", border: "none", borderRadius: 10,
            padding: 16, fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.2em", color: "#F4EEE4", textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Logout
        </SignOutButton>

      </main>

      <BottomNav />

    </div>
  );
}
