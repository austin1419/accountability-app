"use client";

// ─────────────────────────────────────────────
// BriefingShell — full-screen Daily Briefing layout
//
// Single coaching message view.
// Renders the DailyBriefing as a cohesive note
// from a real coach — greeting, snapshot, insight,
// guidance, action — with supporting metrics below.
// ─────────────────────────────────────────────

import { useRouter }       from "next/navigation";
import type { DailyBriefing, AIFeatureReadiness } from "@/lib/ai/types";
import { LockedChatInput }  from "./LockedChatInput";

type Props = {
  briefing:  DailyBriefing;
  readiness: AIFeatureReadiness;
};

// ── Shared styles ──────────────────────────────

const cinzel = "'Cinzel', serif";
const garamond = "'EB Garamond', serif";

const momentumColors: Record<string, string> = {
  building:  "#B8933A",
  steady:    "#807868",
  declining: "#7A1E1E",
  at_risk:   "#7A1E1E",
};

const momentumLabels: Record<string, string> = {
  building:  "BUILDING",
  steady:    "STEADY",
  declining: "DECLINING",
  at_risk:   "AT RISK",
};

const metricStatusColors: Record<string, string> = {
  gold:    "#B8933A",
  neutral: "#807868",
  red:     "#7A1E1E",
};

// ── PULSE logo SVG ─────────────────────────────

function PulseLogo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" width={size} height={size}>
      <polygon
        points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20"
        stroke="#B8933A" strokeWidth={3} fill="none" opacity={0.5}
      />
      <polyline
        points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
        stroke="#B8933A" strokeWidth={4} fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="5" fill="#B8933A" />
    </svg>
  );
}

// ── Criteria progress bar ──────────────────────

function CriteriaRow({ label, current, required, met }: {
  label: string; current: number; required: number; met: boolean;
}) {
  const pct = Math.min(100, (current / required) * 100);
  const fillColor = met ? "#B8933A" : "#3A3020";
  const textColor = met ? "#B8933A" : "#807868";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
      }}>
        <span style={{
          fontFamily: cinzel, fontSize: 8, fontWeight: 700,
          letterSpacing: "0.12em", color: "#807868", textTransform: "uppercase",
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: cinzel, fontSize: 10, fontWeight: 700, color: textColor,
        }}>
          {current} / {required}
          {met && (
            <span style={{ marginLeft: 6, fontSize: 10, color: "#B8933A" }}>&#10003;</span>
          )}
        </span>
      </div>
      <div style={{
        height: 4, borderRadius: 2, background: "#1E1E1E", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2, background: fillColor,
          width: `${pct}%`, transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

// ── Gated state (not enough data) ──────────────

function GatedBriefing({ readiness }: { readiness: AIFeatureReadiness }) {
  const metCount = [readiness.memberDaysMet, readiness.taskDaysMet, readiness.metricLogsMet]
    .filter(Boolean).length;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      flex: 1, padding: "32px 20px", gap: 20,
      textAlign: "center",
    }}>
      {/* PULSE logo */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "rgba(184,147,58,0.08)", border: "1.5px solid #3A3020",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 12,
      }}>
        <PulseLogo size={28} />
      </div>

      {/* Headline */}
      <h2 style={{
        fontFamily: cinzel, fontWeight: 700, fontSize: 14,
        letterSpacing: "0.12em", color: "#F4EEE4",
        textTransform: "uppercase", margin: 0,
      }}>
        Your AI coach is getting ready
      </h2>

      {/* Summary message */}
      <p style={{
        fontFamily: garamond, fontSize: 15, fontStyle: "italic",
        color: "#807868", lineHeight: 1.5, maxWidth: 300, margin: 0,
      }}>
        Daily Briefing unlocks after {readiness.minimumMemberDaysRequired} membership days,
        {" "}{readiness.minimumTaskDaysRequired} task days,
        {" "}and {readiness.minimumMetricLogsRequired} metric logs.
      </p>

      {/* 3-criteria progress */}
      <div style={{
        width: "100%", maxWidth: 320, marginTop: 4,
        background: "#111111", border: "1px solid #1E1E1E",
        borderRadius: 10, padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <CriteriaRow
          label="Membership"
          current={readiness.memberDays}
          required={readiness.minimumMemberDaysRequired}
          met={readiness.memberDaysMet}
        />
        <CriteriaRow
          label="Task Days"
          current={readiness.taskDaysLogged}
          required={readiness.minimumTaskDaysRequired}
          met={readiness.taskDaysMet}
        />
        <CriteriaRow
          label="Metric Logs"
          current={readiness.metricLogsCount}
          required={readiness.minimumMetricLogsRequired}
          met={readiness.metricLogsMet}
        />

        {/* Overall progress label */}
        <div style={{
          borderTop: "1px solid #1E1E1E", paddingTop: 10,
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: cinzel, fontSize: 8, fontWeight: 700,
            letterSpacing: "0.12em", color: "#807868",
            textTransform: "uppercase",
          }}>
            {metCount} of 3 criteria met
          </span>
        </div>
      </div>

      {/* What's still needed */}
      {readiness.blockedReason && (
        <p style={{
          fontFamily: garamond, fontSize: 14, color: "#B8B0A0",
          lineHeight: 1.5, maxWidth: 300, margin: 0,
        }}>
          {readiness.blockedReason}
        </p>
      )}
    </div>
  );
}

// ── Main briefing view ─────────────────────────

export function BriefingShell({ briefing, readiness }: Props) {
  const router = useRouter();
  const accentColor = momentumColors[briefing.momentumState] ?? "#807868";

  return (
    <div style={{
      minHeight: "100dvh", background: "#0D0D0D",
      display: "flex", flexDirection: "column",
      maxWidth: 420, margin: "0 auto",
    }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid #1A1A1A",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#807868", fontSize: 18, padding: "4px 8px",
            fontFamily: garamond,
          }}
          aria-label="Go back"
        >
          ‹ Back
        </button>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <PulseLogo size={20} />
          <span style={{
            fontFamily: cinzel, fontWeight: 700, fontSize: 9,
            letterSpacing: "0.2em", color: "#B8933A",
            textTransform: "uppercase",
          }}>
            Daily Briefing
          </span>
        </div>
        {/* Spacer to balance back button */}
        <div style={{ width: 60 }} />
      </header>

      {/* ── Body ── */}
      {!readiness.available ? (
        <GatedBriefing readiness={readiness} />
      ) : (
        <div style={{
          flex: 1, overflowY: "auto", padding: "0 20px 120px",
          display: "flex", flexDirection: "column",
        }}>
          {/* AI avatar + greeting */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            marginTop: 24, marginBottom: 20,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: "rgba(184,147,58,0.1)", border: "1px solid #3A3020",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PulseLogo size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: garamond, fontSize: 18, color: "#F4EEE4",
                margin: "0 0 2px", lineHeight: 1.3,
              }}>
                {briefing.greeting}
              </p>
              <p style={{
                fontFamily: cinzel, fontSize: 7, letterSpacing: "0.15em",
                color: "#807868", textTransform: "uppercase", margin: 0,
              }}>
                PULSE AI
              </p>
            </div>
          </div>

          {/* ── Coaching message bubble ── */}
          <div style={{
            background: "#111111", border: "1px solid #252525",
            borderRadius: "2px 12px 12px 12px", padding: "18px 20px",
            marginLeft: 48,
            display: "flex", flexDirection: "column", gap: 18,
          }}>
            {/* Momentum badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontFamily: cinzel, fontSize: 7, fontWeight: 700,
                letterSpacing: "0.15em", textTransform: "uppercase",
                color: accentColor,
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}40`,
                borderRadius: 3, padding: "2px 8px",
              }}>
                {momentumLabels[briefing.momentumState] ?? "STEADY"}
              </span>
              {briefing.riskLevel !== "low" && (
                <span style={{
                  fontFamily: cinzel, fontSize: 7, fontWeight: 700,
                  letterSpacing: "0.15em", textTransform: "uppercase",
                  color: "#807868",
                }}>
                  Risk: {briefing.riskLevel.toUpperCase()}
                </span>
              )}
            </div>

            {/* Snapshot */}
            <p style={{
              fontFamily: garamond, fontSize: 16, color: "#F4EEE4",
              margin: 0, lineHeight: 1.5,
            }}>
              {briefing.coachingMessage.snapshot}
            </p>

            {/* Insight */}
            <p style={{
              fontFamily: garamond, fontSize: 15, color: "#B8B0A0",
              margin: 0, lineHeight: 1.5, fontStyle: "italic",
            }}>
              {briefing.coachingMessage.insight}
            </p>

            {/* Guidance */}
            <p style={{
              fontFamily: garamond, fontSize: 15, color: "#B8B0A0",
              margin: 0, lineHeight: 1.5,
            }}>
              {briefing.coachingMessage.guidance}
            </p>

            {/* Action */}
            <div style={{
              borderTop: "1px solid #1E1E1E", paddingTop: 14,
            }}>
              <p style={{
                fontFamily: cinzel, fontSize: 7, fontWeight: 700,
                letterSpacing: "0.2em", color: "#4A3F2A",
                textTransform: "uppercase", marginBottom: 6,
              }}>
                Today&#39;s Focus
              </p>
              <p style={{
                fontFamily: garamond, fontSize: 15, color: "#D4A84B",
                margin: 0, fontStyle: "italic",
              }}>
                {briefing.coachingMessage.action}
              </p>
            </div>
          </div>

          {/* ── Supporting metrics ── */}
          {briefing.metrics.length > 0 && (
            <div style={{
              marginTop: 16, marginLeft: 48,
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(briefing.metrics.length, 4)}, 1fr)`,
              gap: 8,
            }}>
              {briefing.metrics.map((metric, i) => (
                <div key={i} style={{
                  background: "#111111", border: "1px solid #1E1E1E",
                  borderRadius: 8, padding: "10px 12px",
                  textAlign: "center",
                }}>
                  <p style={{
                    fontFamily: cinzel, fontSize: 7, fontWeight: 700,
                    letterSpacing: "0.12em", color: "#807868",
                    textTransform: "uppercase", margin: "0 0 4px",
                  }}>
                    {metric.label}
                  </p>
                  <p style={{
                    fontFamily: garamond, fontSize: 16, fontWeight: 500,
                    color: metricStatusColors[metric.status] ?? "#807868",
                    margin: 0,
                  }}>
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Locked chat input ── */}
      <LockedChatInput />
    </div>
  );
}
