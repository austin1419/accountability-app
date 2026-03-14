"use client";

import { useState, useEffect } from "react";

/**
 * AboutPulseButton — client wrapper that holds modal state.
 * Wrap the logo SVG with this in a Server Component page.
 */
export function AboutPulseButton({ children }: { children: React.ReactNode }) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAbout(true)}
        style={{
          position: "relative",
          width: 44,
          height: 44,
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
        aria-label="About PULSE"
      >
        {/* Outer decorative ring */}
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "1px solid rgba(184,147,58,0.2)",
            pointerEvents: "none",
          }}
        />
        {children}
      </button>
      <AboutPulseModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}

export function AboutPulseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@1,400;1,600&family=EB+Garamond:wght@400;600&display=swap');
        .about-modal-body::-webkit-scrollbar { width: 3px; }
        .about-modal-body::-webkit-scrollbar-track { background: transparent; }
        .about-modal-body::-webkit-scrollbar-thumb { background: #2A2A1A; border-radius: 2px; }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "24px 16px 32px", overflowY: "auto",
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#111111", border: "1px solid #2A2A1A",
            borderRadius: 16, width: "100%", maxWidth: 420, overflow: "hidden",
          }}
        >

          {/* HEADER */}
          <div style={{
            background: "#0D0D0D", borderBottom: "1px solid #252525",
            padding: "20px 22px 18px", display: "flex",
            alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width={28} height={28}>
                <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth="2" fill="none" opacity="0.5"/>
                <polyline points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
                  stroke="#B8933A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="50" cy="50" r="3" fill="#B8933A"/>
              </svg>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "#807868", textTransform: "uppercase" }}>
                About PULSE
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "1px solid #2A2A1A", background: "none",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#807868", fontSize: 15,
                fontFamily: "sans-serif", lineHeight: 1,
              }}
            >
              &#x2715;
            </button>
          </div>

          {/* BODY */}
          <div className="about-modal-body" style={{ padding: "0 22px 24px", maxHeight: 680, overflowY: "auto" }}>

            {/* Hero */}
            <div style={{ padding: "24px 0 20px", textAlign: "center", borderBottom: "1px solid #1E1E1E", marginBottom: 22 }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 32, letterSpacing: "0.35em", color: "#F4EEE4", margin: "12px 0 8px" }}>
                PULSE
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 15, color: "#807868", lineHeight: 1.65, margin: 0 }}>
                Most apps track what you do.<br />PULSE tracks who you&apos;re becoming.
              </p>
            </div>

            {/* Mission */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "#4A3F2A", textTransform: "uppercase", margin: "0 0 12px" }}>
              The Mission
            </p>
            <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#B0A898", lineHeight: 1.75, margin: "0 0 16px" }}>
              PULSE was built on a simple conviction — real change doesn&apos;t start with a better routine. It starts with a clearer picture of who you&apos;re called to be. This app exists to hold you to that standard, every single day.
            </p>

            {/* Scripture */}
            <div style={{ borderLeft: "2px solid #B8933A", padding: "12px 16px", margin: "0 0 24px", background: "rgba(184,147,58,0.04)" }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 15, color: "#D4A84B", lineHeight: 1.7, margin: "0 0 7px" }}>
                &ldquo;For while bodily training is of some value, godliness is of value in every way, as it holds promise for the present life and also for the life to come.&rdquo;
              </p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.15em", color: "#4A3F2A", margin: 0 }}>
                1 Timothy 4:8 — ESV
              </p>
            </div>

            {/* Four Pillars */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "#4A3F2A", textTransform: "uppercase", margin: "0 0 12px" }}>
              The Four Pillars
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
              {[
                { name: "LABOR",   desc: "Training & Activity",     verse: "Prov. 14:23" },
                { name: "NOURISH", desc: "Nutrition & Fueling",      verse: "1 Tim. 4:6"  },
                { name: "SABBATH", desc: "Sleep & Recovery",         verse: "Ps. 127:2"   },
                { name: "TEND",    desc: "Supplements & Daily Care", verse: "Prov. 4:23"  },
              ].map((p) => (
                <div key={p.name} style={{ background: "#141414", border: "1px solid #252525", borderRadius: 8, padding: "14px 14px 12px" }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "#B8933A", display: "block", marginBottom: 3 }}>{p.name}</span>
                  <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: "#807868", display: "block", marginBottom: 6, lineHeight: 1.4 }}>{p.desc}</span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "0.1em", color: "#3A3020", display: "block" }}>{p.verse}</span>
                </div>
              ))}
            </div>

            {/* PULSE AI */}
            <div style={{ background: "#0D0D0D", border: "1px solid #252525", borderRadius: 10, padding: 18, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: "#B8933A", border: "1px solid #3A3020", borderRadius: 3, padding: "3px 7px", textTransform: "uppercase" }}>
                  PULSE AI
                </span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: "#F4EEE4" }}>
                  Your Personal Coach
                </span>
              </div>
              <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868", lineHeight: 1.7, margin: "0 0 14px" }}>
                Every PULSE member gets access to an AI coach trained in nutrition science, exercise physiology, habit formation, and behavior change — and it knows your data.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { bold: "Knows your history.", rest: " Your habits, your compliance, your weight trend — it sees all of it before it says a word." },
                  { bold: "Asks the right questions.", rest: " Not generic advice. It meets you where you are and responds to what's actually happening in your life." },
                  { bold: "Available at 11pm.", rest: " When your coach is asleep, PULSE AI is still there — no appointment needed." },
                  { bold: "Backed by a real coach.", rest: " The AI handles the daily work. Your human coach sets the direction and makes the calls that matter." },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#B8933A", marginTop: 7, flexShrink: 0 }} />
                    <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: "#807868", lineHeight: 1.55, margin: 0 }}>
                      <strong style={{ color: "#DDD5C0", fontWeight: 600 }}>{f.bold}</strong>{f.rest}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* What We Believe */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "#4A3F2A", textTransform: "uppercase", margin: "0 0 12px" }}>
              What We Believe
            </p>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
              {[
                { name: "Faithfulness",   text: "Small obedience done consistently beats perfect plans done rarely." },
                { name: "Stewardship",    text: "Your body is not yours to waste. It was given for a purpose." },
                { name: "Accountability", text: "Someone is watching. That's not a threat — it's a gift." },
                { name: "Identity",       text: "You don't build habits. You build the person who has those habits." },
              ].map((v, i, arr) => (
                <div key={v.name} style={{ padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid #1E1E16" : "none" }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "#B8933A", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                    {v.name}
                  </span>
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#807868", lineHeight: 1.5, margin: 0 }}>
                    {v.text}
                  </p>
                </div>
              ))}
            </div>

          </div>

          {/* FOOTER */}
          <div style={{ borderTop: "1px solid #1E1E1E", padding: "16px 22px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 13, color: "#3A3020", margin: 0 }}>
              Built for people who take their standard seriously.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
