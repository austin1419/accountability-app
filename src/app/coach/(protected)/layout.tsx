// ─────────────────────────────────────────────
// Coach Layout
//
// Wraps all /coach/** routes with a desktop-first shell:
// dark top nav + full-width content area.
// Also verifies the session and role on every coach page load.
// ─────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "HabitOS | Coach Control Center",
  description: "HabitOS coaching control center",
};

export default async function CoachLayout({ children }: { children: React.ReactNode }) {

  // ── Auth check ──────────────────────────────────────────────────
  // The login page is excluded from this layout (it has its own route),
  // so by the time we're here the user should be authenticated.
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

  // ── Shell ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top navigation ────────────────────────── */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-10">

          {/* Brand */}
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-base tracking-tight">
              Habit<span className="text-blue-400">OS</span>
            </span>
            <span className="text-xs text-gray-500 font-normal">Coach Control Center</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-6">
            <Link
              href="/coach"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/coach/clients"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clients
            </Link>
          </div>

          {/* Right side — coach name + sign out */}
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-gray-500">{profile.name}</span>
            <SignOutButton
              redirectTo="/coach/login"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Sign out
            </SignOutButton>
          </div>

        </div>
      </nav>

      {/* ── Page content ──────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>

    </div>
  );
}
