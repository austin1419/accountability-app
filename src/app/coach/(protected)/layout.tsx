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
  title: "PulseOS | Coach Control Center",
  description: "PulseOS coaching control center",
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
    <div className="min-h-screen bg-[#111111]">

      {/* ── Top navigation ────────────────────────── */}
      <nav className="bg-[#0D0D0D] border-b border-[#252525]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-10">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0">
              <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={1} fill="none" opacity={0.4} />
              <polyline
                style={{ filter: "drop-shadow(0 0 3px rgba(184,147,58,0.8))" }}
                points="10,50 22,50 27,50 31,34 35,66 39,50 44,50 50,22 56,50 61,50 65,40 69,60 73,50 78,50 90,50"
                stroke="#B8933A" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            <div className="flex flex-col leading-tight">
              <span
                className="text-[#B8933A] text-sm tracking-[0.25em] uppercase leading-none"
                style={{ fontFamily: "'Cinzel', serif", fontWeight: 900 }}
              >
                PulseOS
              </span>
              <span
                className="text-[10px] text-[#807868] mt-0.5 leading-none"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
              >
                Coach Control Center
              </span>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <Link
              href="/coach"
              className="text-sm text-[#9A9080] hover:text-[#B8933A] hover:bg-[#1A1A1A] px-2.5 py-1.5 rounded cursor-pointer transition-all duration-150"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Dashboard
            </Link>
            <Link
              href="/coach/clients"
              className="text-sm text-[#9A9080] hover:text-[#B8933A] hover:bg-[#1A1A1A] px-2.5 py-1.5 rounded cursor-pointer transition-all duration-150"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Clients
            </Link>
          </div>

          {/* Right side — coach name + sign out */}
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-[#9A9080]">{profile.name}</span>
            <SignOutButton
              redirectTo="/coach/login"
              className="text-xs text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150"
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
