"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDate } from "@/context/DateContext";

const labelStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: "8px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

export function BottomNav() {
  const pathname = usePathname();
  const { selectedDate } = useDate();

  // Build tabs with dynamic href for Today (includes date param for dashboard sync)
  const navTabs = [
    {
      label: "Dash",
      href: `/?date=${selectedDate}`,
      match: "/",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path d="M9 22V12h6v10" />
        </svg>
      ),
    },
    {
      label: "Tasks",
      href: "/tasks",
      match: "/tasks",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      label: "Record",
      href: "/progress",
      match: "/progress",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: "Profile",
      href: "/profile",
      match: "/profile",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Spacer — stays in normal flow so content clears the fixed nav */}
      <div className="h-28 flex-shrink-0" aria-hidden="true" />

      {/* Floating nav container — pill + AI button */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 32px)",
          maxWidth: 420,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Main 4-tab pill */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "10px 6px",
            borderRadius: 40,
            background: "#141414",
            border: "1px solid #252525",
            boxShadow: "0 4px 32px rgba(0,0,0,0.7)",
          }}
        >
          {navTabs.map((tab) => {
            const isActive = pathname === tab.match;
            return (
              <Link
                key={tab.label}
                href={tab.href}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "4px 8px",
                  borderRadius: 30,
                  background: isActive ? "rgba(184,147,58,0.08)" : "transparent",
                  color: isActive ? "#B8933A" : "#3A3020",
                  textDecoration: "none",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                {tab.icon}
                <span style={labelStyle}>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* PULSE AI circle button */}
        <span
          style={{
            position: "relative",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(184,147,58,0.12)",
            border: "1.5px solid #B8933A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
          }}
          aria-label="PulseAI — coming soon"
        >
          {/* Decorative outer ring */}
          <div
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "1px solid rgba(184,147,58,0.2)",
              pointerEvents: "none",
            }}
          />
          {/* PULSE logo */}
          <svg viewBox="0 0 100 100" fill="none" width={28} height={28}>
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
          {/* AI label */}
          <span
            style={{
              position: "absolute",
              bottom: -16,
              fontFamily: "'Cinzel', serif",
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#B8933A",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            AI
          </span>
        </span>
      </div>
    </>
  );
}
