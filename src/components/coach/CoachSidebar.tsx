"use client";

// ─────────────────────────────────────────────
// CoachSidebar — persistent left navigation
//
// Pure UI. No data fetching, no Supabase, no context.
// Uses usePathname for active-link highlighting.
// ─────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

type NavItem = {
  label: string;
  href: string;
  match: string; // pathname prefix to match for active state
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/coach",
    match: "/coach",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/coach/clients",
    match: "/coach/clients",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/coach/analytics",
    match: "/coach/analytics",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "Notes",
    href: "/coach/notes",
    match: "/coach/notes",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/coach/reports",
    match: "/coach/reports",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

function isActive(pathname: string, match: string): boolean {
  // Dashboard: exact match only (avoid matching /coach/clients etc.)
  if (match === "/coach") return pathname === "/coach";
  // All others: prefix match
  return pathname.startsWith(match);
}

export function CoachSidebar({ coachName }: { coachName: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[190px] bg-[#0D0D0D] border-r border-[#1E1E1E] flex flex-col z-40"
      style={{ padding: "20px 0" }}
    >
      {/* ── Brand ──────────────────────────────── */}
      <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #1E1E1E", marginBottom: "16px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: "2px" }}>
          <svg viewBox="0 0 100 100" fill="none" width="18" height="18" className="flex-shrink-0">
            <polygon
              points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20"
              stroke="#B8933A" strokeWidth={2.5} fill="none" opacity={0.5}
            />
            <polyline
              points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
              stroke="#B8933A" strokeWidth={3} fill="none"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="4" fill="#B8933A" />
          </svg>
          <span
            className="text-[#F4EEE4] uppercase leading-none"
            style={{ fontFamily: cinzel, fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em" }}
          >
            PulseOS
          </span>
        </div>
        <span
          className="leading-none block"
          style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#3A3020", marginLeft: "26px" }}
        >
          Coach Control Center
        </span>
      </div>

      {/* ── Navigation ─────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto" style={{ padding: "0 8px" }}>
        {navItems.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center transition-all duration-150"
              style={{
                gap: "9px",
                padding: "8px 10px",
                borderRadius: "6px",
                fontFamily: cinzel,
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: active ? "#B8933A" : "#4A3F2A",
                background: active ? "rgba(184,147,58,0.08)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ color: active ? "#B8933A" : "#4A3F2A" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────── */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1E1E1E", marginTop: "auto" }}>
        <p
          className="uppercase"
          style={{ fontFamily: cinzel, fontSize: "9px", letterSpacing: "0.1em", color: "#4A3F2A" }}
        >
          {coachName}
        </p>
        <SignOutButton
          redirectTo="/coach/login"
          className="cursor-pointer mt-1 block"
          style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#3A3020", background: "none", border: "none", padding: 0 }}
        >
          Sign out
        </SignOutButton>
      </div>
    </aside>
  );
}
