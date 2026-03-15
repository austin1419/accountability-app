// ─────────────────────────────────────────────
// Coach Layout
//
// Wraps all /coach/** routes with the PulseOS shell:
// persistent sidebar + top bar + content container.
// Verifies session and role on every coach page load.
//
// Auth logic is preserved exactly from the original layout.
// ─────────────────────────────────────────────

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { CoachSidebar } from "@/components/coach/CoachSidebar";
import { CoachTopBar } from "@/components/coach/CoachTopBar";
import { CoachPageContainer } from "@/components/coach/CoachPageContainer";

export const metadata: Metadata = {
  title: "PulseOS | Coach Control Center",
  description: "PulseOS coaching control center",
};

export default async function CoachLayout({ children }: { children: React.ReactNode }) {

  // ── Auth check (unchanged from original) ──────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/coach/login");

  // Verify the user is actually a coach, not a client who guessed the URL.
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("name, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "coach") redirect("/login");

  // ── Shell ─────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#141414]"
      style={{
        "--coach-bg": "#141414",
        "--coach-sidebar": "#0D0D0D",
        "--coach-surface": "#0D0D0D",
        "--coach-topbar": "#111111",
        "--coach-border": "#1E1E1E",
        "--coach-border-subtle": "#252525",
        "--coach-gold": "#B8933A",
        "--coach-gold-bg": "rgba(184,147,58,0.08)",
        "--coach-gold-border": "#3A3020",
        "--coach-gold-dim": "#4A3F2A",
        "--coach-crimson": "#7A1E1E",
        "--coach-crimson-bg": "rgba(122,30,30,0.10)",
        "--coach-crimson-border": "#3A1010",
        "--coach-text-primary": "#F4EEE4",
        "--coach-text-warm": "#DDD5C0",
        "--coach-text-muted": "#807868",
        "--coach-text-dim": "#4A3F2A",
        "--coach-divider": "#1A1A1A",
      } as React.CSSProperties}
    >
      <CoachSidebar coachName={profile.name} />

      {/* Content area — offset by sidebar width */}
      <div className="ml-[190px] min-h-screen flex flex-col">
        <CoachTopBar />
        <main className="flex-1">
          <CoachPageContainer>
            {children}
          </CoachPageContainer>
        </main>
      </div>
    </div>
  );
}
