// ─────────────────────────────────────────────
// CLIENT DASHBOARD — connected to Supabase
//
// This is a Server Component (no "use client" directive).
// In Next.js App Router, server components can be async — they fetch
// data before rendering, so the page arrives fully populated.
// No loading spinners, no useEffect, no useState needed here.
// ─────────────────────────────────────────────

import React                     from "react";
import { redirect }              from "next/navigation";
import { LinkCard }              from "@/components/LinkCard";
import { BottomNav }             from "@/components/BottomNav";
import { DateHeader }            from "@/components/DateHeader";
import { DateSync }              from "@/components/DateSync";
import { SplashScreen }          from "@/components/SplashScreen";
import { fetchDashboard, fetchStatusScore } from "@/lib/server-queries";
import { fetchDailyBriefingReadiness } from "@/lib/ai/getAIFeatureReadiness";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }     from "@/lib/supabase-admin";
import { COMPLIANCE_TARGET }    from "@/lib/constants/thresholds";
import { AboutPulseButton }     from "@/components/AboutPulseModal";
import { BriefingButton }      from "@/components/briefing/BriefingButton";

// Always render fresh from the server — required so searchParams-driven
// date navigation actually re-fetches Supabase data on each navigation.
export const dynamic = "force-dynamic";

// Validates a raw date string from the URL.
// Returns todayStr for any missing, malformed, or future value.
function validateDate(raw: string | undefined, todayStr: string): string {
  if (!raw) return todayStr;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return todayStr;
  const d = new Date(raw + "T00:00:00");
  if (isNaN(d.getTime())) return todayStr;
  if (raw > todayStr) return todayStr; // clamp future dates to today
  return raw;
}

// Shared inline styles
const sectionLabel: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.2em", color: "#4A3F2A", textTransform: "uppercase",
  marginBottom: 8,
};
const card: React.CSSProperties = {
  background: "#141414", border: "1px solid #252525", borderRadius: 10,
};
const divider: React.CSSProperties = {
  height: 1, background: "#1A1A1A", margin: "14px 0",
};

export default async function ClientDashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  // ── Auth check ───────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Look up the user's public.users row (the id used in all data tables)
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // ── Date handling ────────────────────────────────────────────────
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const params   = await searchParams;
  const selectedDate = validateDate(params.date, todayStr);

  // ── Fetch dashboard data ─────────────────────────────────────────
  let data: Awaited<ReturnType<typeof fetchDashboard>>;
  let statusScore: Awaited<ReturnType<typeof fetchStatusScore>>;
  let briefingReadiness: Awaited<ReturnType<typeof fetchDailyBriefingReadiness>>;
  try {
    [data, statusScore, briefingReadiness] = await Promise.all([
      fetchDashboard(profile.id, selectedDate),
      fetchStatusScore(profile.id, selectedDate),
      fetchDailyBriefingReadiness(profile.id),
    ]);
  } catch (err) {
    console.error("[ClientDashboard] fetchDashboard failed:", err);
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center max-w-md mx-auto px-5">
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868" }}>
          Unable to load your dashboard. Please refresh to try again.
        </p>
      </div>
    );
  }

  const { clientName, goal, today } = data;

  // ── Derived display values ───────────────────────────────────────
  const daysLeft = goal?.goal_date
    ? Math.ceil(
        (new Date(goal.goal_date + "T00:00:00").getTime() - new Date(selectedDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const goalProgress = goal?.goalProgress ?? 0;
  const progressCircumference = 2 * Math.PI * 62; // r=62 → ~389.6
  const progressOffset = progressCircumference * (1 - goalProgress / 100);

  const complianceCircumference = 2 * Math.PI * 36; // r=36 → ~226.2
  const complianceOffset = complianceCircumference * (1 - today.percent / 100);

  // Goal category display label
  const goalCategoryLabel = goal
    ? goal.goal_category === "weight"
      ? "Weight"
      : goal.goal_category === "body_composition"
      ? "Body Composition"
      : (goal.performance_metric_name ?? "Performance")
    : "";

  // Progress stats — adapt to goal category
  function getProgressStats() {
    if (!goal) return [];
    if (goal.goal_category === "weight") {
      return [
        { label: "Starting", value: goal.start_weight != null ? `${goal.start_weight} lbs` : "—", gold: false },
        { label: "Current",  value: goal.current_weight != null ? `${goal.current_weight} lbs` : "—", gold: false },
        { label: "Goal",     value: goal.goal_weight != null ? `${goal.goal_weight} lbs` : "—", gold: true },
      ];
    }
    if (goal.goal_category === "body_composition") {
      const currentBF  = goal.current_body_fat  ?? goal.starting_body_fat;
      const currentSMM = goal.current_smm       ?? goal.starting_smm;
      return [
        { label: "Starting BF", value: goal.starting_body_fat != null ? `${goal.starting_body_fat}%` : "—", gold: false },
        { label: "Current BF",  value: currentBF != null ? `${currentBF}%` : "—", gold: false },
        { label: "Goal BF",     value: goal.goal_body_fat != null ? `${goal.goal_body_fat}%` : "—", gold: true },
        { label: "Starting SMM", value: goal.starting_smm != null ? `${goal.starting_smm} lbs` : "—", gold: false },
        { label: "Current SMM",  value: currentSMM != null ? `${currentSMM} lbs` : "—", gold: false },
        { label: "Goal SMM",     value: goal.goal_smm != null ? `${goal.goal_smm} lbs` : "—", gold: true },
      ];
    }
    // performance
    const unit = goal.performance_unit ? ` ${goal.performance_unit}` : "";
    return [
      { label: "Starting", value: goal.starting_performance_value != null ? `${goal.starting_performance_value}${unit}` : "—", gold: false },
      { label: "Current",  value: goal.current_performance_value != null ? `${goal.current_performance_value}${unit}` : "—", gold: false },
      { label: "Goal",     value: goal.goal_performance_value != null ? `${goal.goal_performance_value}${unit}` : "—", gold: true },
    ];
  }
  const progressStats = getProgressStats();

  // Status badge config
  const statusCfg: Record<string, { label: string; color: string; border: string }> = {
    ahead:    { label: "Ahead",    color: "#4CAF50", border: "#4CAF50" },
    on_track: { label: "On Track", color: "#B8933A", border: "#B8933A" },
    behind:   { label: "Behind",   color: "#7A1E1E", border: "#7A1E1E" },
    no_data:  { label: "No Data",  color: "#807868", border: "#807868" },
  };
  const statusBadge = statusCfg[statusScore.progressStatus] ?? statusCfg.no_data;

  // Compliance conditional message
  const complianceMessage =
    today.percent === 100
      ? { text: "Well done", color: "#B8933A" }
      : today.percent >= COMPLIANCE_TARGET
      ? { text: "On target", color: "#B8933A" }
      : { text: "Finish what you started.", color: "#807868" };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col max-w-md mx-auto">

      <SplashScreen />

      {/* ── Header ───────────────────────────────── */}
      <header style={{ padding: "40px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          {/* Left — welcome + name */}
          <div>
            <p style={{
              fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.18em",
              color: "#B8933A", textTransform: "uppercase", marginBottom: 3,
            }}>
              Welcome,
            </p>
            <h1 style={{
              fontFamily: "'EB Garamond', serif", fontSize: 30, fontWeight: 600,
              color: "#F4EEE4", lineHeight: 1.05, margin: 0,
            }}>
              {clientName}
            </h1>
          </div>
          {/* Right — PULSE logo button */}
          <AboutPulseButton>
            <svg viewBox="0 0 100 100" fill="none" width={24} height={24}>
              <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={2.5} fill="none" opacity={0.5} />
              <polyline
                points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
                stroke="#B8933A" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="50" cy="50" r="4" fill="#B8933A" />
            </svg>
          </AboutPulseButton>
        </div>
      </header>

      {/* ── Date navigation ─────────────────────── */}
      <DateSync date={selectedDate} />
      <DateHeader userId={profile.id} />

      {/* ── Scrollable content ───────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── GOAL CARD ── */}
        <p style={sectionLabel}>Your Goal</p>
        {goal ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...card, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {/* Left */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.18em",
                  color: "#807868", textTransform: "uppercase", marginBottom: 4,
                }}>
                  Your Goal
                </p>
                <p style={{
                  fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "0.15em",
                  color: "#B8933A", textTransform: "uppercase", marginBottom: 4,
                }}>
                  {goalCategoryLabel}
                </p>
                <p style={{
                  fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 600,
                  color: "#F4EEE4", marginBottom: 3, lineHeight: 1.15,
                }}>
                  {goal.goal_name}
                </p>
                {goal.goal_date && (
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: "#807868" }}>
                    {new Date(goal.goal_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                )}
              </div>
              {/* Right — days left badge */}
              {daysLeft != null && daysLeft >= 0 && (
                <div style={{
                  minWidth: 70, height: 70, borderRadius: 8,
                  border: "1.5px solid #3A3020", background: "rgba(184,147,58,0.03)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 26,
                    color: "#D4A84B", lineHeight: 1,
                  }}>
                    {daysLeft}
                  </span>
                  <span style={{
                    fontFamily: "'Cinzel', serif", fontSize: 7, letterSpacing: "0.12em",
                    color: "#807868", textTransform: "uppercase", marginTop: 3,
                  }}>
                    Days Left
                  </span>
                </div>
              )}
            </div>

            {/* ── DAILY BRIEFING TILE ── */}
            <div
              style={{
                background: "#111111", border: "1px solid #2A2A1A", borderRadius: 10,
                padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
                opacity: briefingReadiness.available ? 1 : 0.6,
              }}
            >
              {/* Left */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(184,147,58,0.08)", border: "1px solid #3A3020",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg viewBox="0 0 100 100" fill="none" width={20} height={20}>
                    <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={3} fill="none" opacity={0.5} />
                    <polyline points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50" stroke="#B8933A" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="50" cy="50" r="5" fill="#B8933A" />
                  </svg>
                </div>
                <div>
                  <p style={{
                    fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 10,
                    letterSpacing: "0.15em", color: "#F4EEE4", textTransform: "uppercase", marginBottom: 3,
                  }}>
                    Daily Briefing
                  </p>
                  <p style={{
                    fontFamily: "'EB Garamond', serif", fontSize: 12, fontStyle: "italic", color: "#807868", margin: 0,
                  }}>
                    Your AI coach has something for you.
                  </p>
                </div>
              </div>
              {/* Right — action button */}
              <BriefingButton available={briefingReadiness.available} />
            </div>
          </div>
        ) : (
          <div style={{ ...card, padding: 16 }}>
            <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868" }}>
              No goal set yet.
            </p>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── PROGRESS TOWARD GOAL ── */}
        {goal && (
          <>
            <p style={sectionLabel}>Progress Toward Goal</p>
            <LinkCard href="/progress">
              <section style={{ ...card, overflow: "hidden" }}>
                {/* Body */}
                <div style={{ display: "flex", alignItems: "center", padding: 16 }}>
                  {/* Ring column */}
                  <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <div style={{ position: "relative", width: 148, height: 148 }}>
                      <svg width={148} height={148} viewBox="0 0 148 148">
                        <circle cx={74} cy={74} r={62} stroke="#252525" strokeWidth={9} fill="none" />
                        <circle
                          cx={74} cy={74} r={62}
                          stroke="#B8933A" strokeWidth={9} fill="none"
                          strokeLinecap="round"
                          strokeDasharray={progressCircumference}
                          strokeDashoffset={progressOffset}
                          transform="rotate(-90 74 74)"
                          style={{ transition: "stroke-dashoffset 0.5s ease" }}
                        />
                      </svg>
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{
                          fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 30,
                          color: "#F4EEE4", lineHeight: 1,
                        }}>
                          {goalProgress}%
                        </span>
                        <span style={{
                          fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 13,
                          color: "#807868", marginTop: 3,
                        }}>
                          complete
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Stats column */}
                  {progressStats.length > 3 ? (
                    /* Body composition: two-column grid (BF | SMM) */
                    <div style={{
                      flex: 1, paddingLeft: 16, borderLeft: "1px solid #252525",
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px",
                    }}>
                      {/* Column headers */}
                      <span style={{
                        fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "0.12em",
                        color: "#807868", textTransform: "uppercase",
                      }}>
                        Body Fat
                      </span>
                      <span style={{
                        fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "0.12em",
                        color: "#807868", textTransform: "uppercase",
                      }}>
                        SMM
                      </span>
                      {/* Rows: Starting, Current, Goal — BF left, SMM right */}
                      {[0, 1, 2].map((row) => {
                        const bf  = progressStats[row];
                        const smm = progressStats[row + 3];
                        const rowLabel = ["Starting", "Current", "Goal"][row];
                        return (
                          <React.Fragment key={rowLabel}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                              <span style={{
                                fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                                fontSize: 10, color: "#807868",
                              }}>
                                {rowLabel}
                              </span>
                              <span style={{
                                fontFamily: "'EB Garamond', serif", fontSize: 16, fontWeight: 600,
                                color: bf.gold ? "#B8933A" : "#F4EEE4", lineHeight: 1.1,
                              }}>
                                {bf.value}
                              </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                              <span style={{
                                fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                                fontSize: 10, color: "#807868",
                              }}>
                                {rowLabel}
                              </span>
                              <span style={{
                                fontFamily: "'EB Garamond', serif", fontSize: 16, fontWeight: 600,
                                color: smm.gold ? "#B8933A" : "#F4EEE4", lineHeight: 1.1,
                              }}>
                                {smm.value}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ) : (
                    /* Weight / Performance: single column */
                    <div style={{
                      flex: 1, paddingLeft: 20, borderLeft: "1px solid #252525",
                      display: "flex", flexDirection: "column", justifyContent: "center", gap: 14,
                    }}>
                      {progressStats.map((s) => (
                        <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <span style={{
                            fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                            fontSize: 12, color: "#807868",
                          }}>
                            {s.label}
                          </span>
                          <span style={{
                            fontFamily: "'EB Garamond', serif", fontSize: 20, fontWeight: 600,
                            color: s.gold ? "#B8933A" : "#F4EEE4", lineHeight: 1.1,
                          }}>
                            {s.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </LinkCard>

            <div style={divider} />
          </>
        )}

        {/* ── TODAY'S COMPLIANCE ── */}
        <p style={sectionLabel}>Today&apos;s Compliance</p>
        <LinkCard href="/tasks">
          <section style={{ ...card, padding: 16, display: "flex", alignItems: "center" }}>
            {/* Left */}
            <div style={{ flex: 1, paddingRight: 16, display: "flex", flexDirection: "column", gap: 5 }}>
              <p style={{
                fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 10,
                letterSpacing: "0.15em", color: "#F4EEE4", textTransform: "uppercase", margin: 0,
              }}>
                Today&apos;s Compliance
              </p>
              {today.total === 0 ? (
                <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868", fontStyle: "italic" }}>
                  Add habits to begin tracking
                </p>
              ) : (
                <>
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868", margin: 0 }}>
                    {today.completed} of {today.total} tasks complete
                  </p>
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 12, fontStyle: "italic", color: "#4A3F2A", margin: 0 }}>
                    Target: 70% or better
                  </p>
                  <p style={{
                    fontFamily: "'EB Garamond', serif", fontSize: 13, fontStyle: "italic",
                    color: complianceMessage.color, margin: 0,
                  }}>
                    {complianceMessage.text}
                  </p>
                </>
              )}
            </div>
            {/* Right — compliance ring */}
            {today.total > 0 && (
              <div style={{ flexShrink: 0, position: "relative" }}>
                <svg width={90} height={90} viewBox="0 0 90 90">
                  <circle cx={45} cy={45} r={36} stroke="#252525" strokeWidth={7} fill="none" />
                  <circle
                    cx={45} cy={45} r={36}
                    stroke={today.percent >= COMPLIANCE_TARGET ? "#B8933A" : "#7A1E1E"}
                    strokeWidth={7} fill="none"
                    strokeLinecap="round"
                    strokeDasharray={complianceCircumference}
                    strokeDashoffset={complianceOffset}
                    transform="rotate(-90 45 45)"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 20,
                    color: "#B8933A", lineHeight: 1,
                  }}>
                    {today.percent}%
                  </span>
                </div>
              </div>
            )}
          </section>
        </LinkCard>

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── STATUS ── */}
        <p style={sectionLabel}>Status</p>
        <div style={{ ...card, padding: 16 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{
              fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.2em", color: "#807868", textTransform: "uppercase",
            }}>
              Overall Standing
            </span>
            <span style={{
              fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 700,
              letterSpacing: "0.15em", color: statusBadge.color, textTransform: "uppercase",
              border: `1.5px solid ${statusBadge.border}`, borderRadius: 4, padding: "4px 10px",
            }}>
              {statusBadge.label}
            </span>
          </div>
          {/* Three metrics */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[
              { label: "Compliance", value: today.total === 0 ? "—" : statusScore.complianceScore, gold: false },
              { label: "Progress",   value: statusScore.progressScore, gold: false },
              { label: "Overall",    value: today.total === 0 ? "—" : statusScore.overallScore, gold: true },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  borderLeft: i > 0 ? "1px solid #1E1E1E" : "none",
                }}
              >
                <span style={{
                  fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, lineHeight: 1,
                  color: item.gold ? "#B8933A" : "#F4EEE4",
                }}>
                  {item.value}
                </span>
                <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 11, color: "#807868" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
