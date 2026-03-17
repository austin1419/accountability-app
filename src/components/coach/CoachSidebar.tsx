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
  match: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/coach",
    match: "/coach",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "Alerts",
    href: "/coach/alerts",
    match: "/coach/alerts",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    label: "Notes",
    href: "/coach/notes",
    match: "/coach/notes",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

function isActive(pathname: string, match: string): boolean {
  if (match === "/coach") {
    return pathname === "/coach" || pathname === "/coach/dashboard";
  }
  return pathname.startsWith(match);
}

export function CoachSidebar({ coachName }: { coachName: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[180px] flex flex-col z-40"
      style={{ background: "#070707", borderRight: "1px solid #141414" }}
    >
      {/* ── Top shimmer line ──────────────────── */}
      <div className="h-[1px] w-full" style={{ background: "linear-gradient(90deg, transparent 0%, #B8933A22 25%, #B8933A33 50%, #B8933A22 75%, transparent 100%)" }} />

      {/* ── Brand ──────────────────────────────── */}
      <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid #111111" }}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: "3px" }}>
          <svg viewBox="0 0 100 100" fill="none" width="15" height="15" className="flex-shrink-0">
            <polygon
              points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20"
              stroke="#B8933A" strokeWidth={2.5} fill="none" opacity={0.4}
            />
            <polyline
              points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
              stroke="#B8933A" strokeWidth={3} fill="none"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="3.5" fill="#B8933A" />
          </svg>
          <span
            className="text-[#F4EEE4] uppercase leading-none"
            style={{ fontFamily: cinzel, fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em" }}
          >
            PulseOS
          </span>
        </div>
        <span
          className="leading-none block"
          style={{ fontFamily: ebGaramond, fontSize: "9px", fontStyle: "italic", color: "#2A2010", marginLeft: "27px" }}
        >
          Coach Control Center
        </span>
      </div>

      {/* ── EKG decorative line ────────────────── */}
      <div className="px-4 mt-3 mb-1">
        <svg viewBox="0 0 160 20" className="w-full h-[12px] opacity-15" preserveAspectRatio="none">
          <polyline
            points="0,10 20,10 30,10 38,3 46,17 54,10 65,10 75,2 85,10 100,10 108,6 116,14 124,10 140,10 160,10"
            stroke="#B8933A" strokeWidth={1.5} fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ── Navigation ─────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-[2px] overflow-y-auto" style={{ padding: "4px 7px" }}>
        {navItems.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center transition-all duration-150"
              style={{
                gap: "9px",
                padding: "8px 9px",
                borderRadius: "5px",
                fontFamily: cinzel,
                fontSize: "8px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: active ? "#B8933A" : "#4A3F2A",
                background: active ? "rgba(184,147,58,0.06)" : "transparent",
                borderLeft: active ? "2px solid #B8933A" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.color = "#807868";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#4A3F2A";
                }
              }}
            >
              <span className="flex-shrink-0" style={{ color: active ? "#B8933A" : "#4A3F2A", opacity: active ? 1 : 0.7 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────── */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #111111" }}>
        <p
          className="uppercase truncate"
          style={{ fontFamily: cinzel, fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
        >
          {coachName}
        </p>
        <SignOutButton
          redirectTo="/coach/login"
          className="cursor-pointer mt-1.5 block"
          style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#2A2010", background: "none", border: "none", padding: 0 }}
        >
          Sign out
        </SignOutButton>
      </div>
    </aside>
  );
}
