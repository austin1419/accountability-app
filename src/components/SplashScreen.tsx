"use client";

// ─────────────────────────────────────────────
// SplashScreen — plays once per session on client dashboard entry.
//
// Rendered as a fixed full-screen overlay (z-9999) inside page.tsx.
// sessionStorage prevents replay during normal navigation.
// Total animation: ~4.2 s.
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";

export function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");

  useEffect(() => {
    if (sessionStorage.getItem("pulse_splash")) return;
    setPhase("in");
    const fadeOut = setTimeout(() => setPhase("out"),    3500);
    const done    = setTimeout(() => {
      sessionStorage.setItem("pulse_splash", "1");
      setPhase("hidden");
    }, 4200);
    return () => { clearTimeout(fadeOut); clearTimeout(done); };
  }, []);

  if (phase === "hidden") return null;

  return (
    <>
      <style>{`
        @keyframes splashFadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.14); filter: drop-shadow(0 0 14px rgba(184,147,58,0.75)); }
        }
        @keyframes splashTextIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] bg-[#0D0D0D] flex flex-col items-center justify-center pointer-events-none"
        style={{ animation: phase === "out" ? "splashOut 0.7s ease-out forwards" : undefined }}
      >
        {/* Logo — fades in, then pulses once */}
        <div style={{ animation: "splashFadeIn 0.8s ease-out forwards, splashPulse 1.5s ease-in-out 0.8s forwards" }}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
            <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={1} fill="none" opacity={0.4} />
            <polygon points="50,14 80,28 90,57 76,82 50,90 24,82 10,57 20,28" stroke="#B8933A" strokeWidth={0.5} fill="none" opacity={0.2} />
            <polyline
              style={{ filter: "drop-shadow(0 0 4px rgba(184,147,58,0.9))" }}
              points="10,50 22,50 27,50 31,34 35,66 39,50 44,50 50,22 56,50 61,50 65,40 69,60 73,50 78,50 90,50"
              stroke="#B8933A" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="3" fill="#B8933A" />
          </svg>
        </div>

        {/* PULSE wordmark */}
        <p
          className="text-4xl tracking-[0.4em] text-[#F4EEE4] uppercase mt-6"
          style={{
            fontFamily:  "'Cinzel', serif",
            fontWeight:  900,
            opacity:     0,
            animation:   "splashTextIn 0.7s ease-out 1.5s forwards",
          }}
        >
          PULSE
        </p>

        {/* Tagline */}
        <p
          className="text-sm text-[#807868] mt-3 text-center leading-relaxed flex flex-col"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle:  "italic",
            opacity:    0,
            animation:  "splashTextIn 0.7s ease-out 2.2s forwards",
          }}
        >
          <span>Most apps track what you do.</span>
          <span>PULSE tracks who you&apos;re becoming.</span>
        </p>
      </div>
    </>
  );
}
