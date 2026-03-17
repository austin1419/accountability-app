// ─────────────────────────────────────────────
// COACH DASHBOARD — War Room
//
// Server Component. Fetches all data before render.
// Uses dedicated dashboard utility, not the RPC.
// ─────────────────────────────────────────────

import { getCoachDashboardData } from "@/lib/coach/dashboard/getCoachDashboardData";
import { resolveCoachId } from "@/lib/coach/resolveCoachId";
import type { DashboardAlert, PillarBreakdown } from "@/lib/coach/dashboard/getCoachDashboardData";

import { AmbientBar } from "@/components/coach/AmbientBar";
import { RosterScorecard } from "@/components/coach/RosterScorecard";

/* Prototype surface tokens */
const BG_TOPBAR = "#0A0A0A";
const BG_PAGE = "#111111";
const BORDER = "#1A1A1A";

export const dynamic = "force-dynamic";

const C = "'Cinzel', serif";
const G = "'EB Garamond', serif";

// ── Display helpers ──────────────────────────────────────────────

function cColor(pct: number | null): string {
  if (pct === null) return "#4A3F2A";
  if (pct >= 70) return "#1D9E75";
  if (pct >= 40) return "#B8933A";
  return "#7A1E1E";
}

function atl(t: string): string { return t.replace(/_/g, " "); }

function relTime(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const intLabels: Record<string, string> = {
  message_client: "Message Client", adjust_habit: "Adjust Habit",
  schedule_call: "Schedule Call", review_progress: "Review Progress", other: "Other",
};

// ── Page ─────────────────────────────────────────────────────────

export default async function CoachDashboardPage() {
  const coachId = await resolveCoachId();
  const dash = await getCoachDashboardData(coachId);
  const { clients, roster, kpis, priorityItems, attentionQueue, recentInterventions, followUpsDue, pillarBreakdown, weeklyTrend, coachInsights } = dash;

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  // Weakest pillar for insight text
  const activePillars = pillarBreakdown.filter((p) => p.avgPct !== null && p.taskCount > 0);
  const weakest = activePillars.reduce<PillarBreakdown | null>(
    (w, p) => (!w || (p.avgPct ?? 100) < (w.avgPct ?? 100) ? p : w), null,
  );

  return (
    <div className="-mx-6 -mt-6 lg:-mx-8" style={{ background: BG_PAGE }}>

      {/* ── Ambient Bar ──────────────────────────── */}
      <AmbientBar thriving={roster.thriving} atRisk={roster.atRisk} critical={roster.critical} total={roster.total} />

      {/* ── Topbar ───────────────────────────────── */}
      <div className="flex items-center justify-between" style={{ background: BG_TOPBAR, borderBottom: `1px solid ${BORDER}`, padding: "11px 22px" }}>
        <div>
          <div style={{ fontFamily: C, fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", color: "#F4EEE4" }}>War Room</div>
          <div style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#3A3020", marginTop: "1px" }}>
            {todayDate} · {roster.total} active clients
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RosterScorecard thriving={roster.thriving} atRisk={roster.atRisk} critical={roster.critical} />
          <a href="/coach/clients?add=true" className="no-underline uppercase" style={{ fontFamily: C, fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.1em", padding: "5px 13px", borderRadius: "3px", background: "rgba(184,147,58,0.08)", border: "1px solid #B8933A", color: "#B8933A", cursor: "pointer" }}>
            + Add Client
          </a>
        </div>
      </div>

      {/* ── Priority Strip ───────────────────────── */}
      <div className="flex items-center overflow-hidden" style={{ background: "#060606", borderBottom: `1px solid ${BORDER}`, padding: "5px 22px", gap: "10px" }}>
        <span style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, letterSpacing: "0.2em", color: "#2A2010", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>Now</span>
        <div style={{ width: "1px", height: "12px", background: "#1A1A1A", flexShrink: 0 }} />
        {priorityItems.length === 0 ? (
          <span style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#0D3A25" }}>No priority alerts right now.</span>
        ) : (
          <div className="flex items-center gap-2.5 overflow-hidden">
            {priorityItems.map((item, idx) => (
              <span key={`${item.clientId}-${idx}`} className="flex items-center gap-1.5 flex-shrink-0">
                {idx > 0 && <span style={{ color: "#1A1A1A", fontSize: "11px" }}>·</span>}
                <span className="rounded-full flex-shrink-0" style={{ width: "4px", height: "4px", background: item.alertType === "inactivity_streak" || item.alertType === "compliance_drop" ? "#7A1E1E" : "#B8933A" }} />
                <a href={`/coach/clients/${item.clientId}`} className="no-underline hover:opacity-80" style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#807868", whiteSpace: "nowrap" }}>
                  <strong style={{ color: "#DDD5C0", fontStyle: "normal", fontWeight: 600 }}>{item.clientName}</strong> — {atl(item.alertType)}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────── */}
      <div style={{ padding: "12px 22px 24px" }}>

        {/* ── KPI Strip ──────────────────────────── */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <KPI label="Clients at Risk" sub="need action today" value={kpis.clientsAtRisk} accent="crimson" />
          <KPI label="Critical Alerts" sub="priority 1" value={kpis.criticalAlerts} accent="crimson-dim" />
          <KPI label="Warning Alerts" sub="priority 2+" value={kpis.warningAlerts} accent="gold" />
          <KPI label="Interventions Today" sub="actions logged" value={kpis.interventionsToday} accent="green" />
          <KPI label="Resolved Today" sub="closed out" value={kpis.resolvedToday} accent="neutral" />
        </div>

        {/* ── Roster Health Bar ──────────────────── */}
        <div className="mb-3">
          <div className="flex h-[4px] rounded-[3px] overflow-hidden gap-[1px] mb-1">
            {roster.thriving > 0 && <div style={{ flex: roster.thriving, background: "#1D9E75" }} />}
            {roster.atRisk > 0 && <div style={{ flex: roster.atRisk, background: "#B8933A" }} />}
            {roster.critical > 0 && <div style={{ flex: roster.critical, background: "#7A1E1E" }} />}
            {roster.goneDark > 0 && <div style={{ flex: roster.goneDark, background: "#2A2010" }} />}
          </div>
          <div className="flex justify-between">
            <span style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#1D9E75", textTransform: "uppercase" }}>{roster.thriving} Thriving ({roster.total > 0 ? Math.round(roster.thriving / roster.total * 100) : 0}%)</span>
            <span style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#B8933A", textTransform: "uppercase" }}>{roster.atRisk} At Risk ({roster.total > 0 ? Math.round(roster.atRisk / roster.total * 100) : 0}%)</span>
            <span style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#7A1E1E", textTransform: "uppercase" }}>{roster.critical + roster.goneDark} Critical ({roster.total > 0 ? Math.round((roster.critical + roster.goneDark) / roster.total * 100) : 0}%)</span>
          </div>
        </div>

        {/* ── Main Grid ──────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: "12px", alignItems: "start" }}>

          {/* ── LEFT COLUMN ──────────────────────── */}
          <div className="flex flex-col gap-[10px]">

            {/* Attention Queue */}
            <Panel>
              <SHdr title="Attention Queue" badge={attentionQueue.length > 0 ? `${attentionQueue.length} urgent` : undefined} badgeAccent="crimson" />
              {attentionQueue.length === 0 ? (
                <Empty msg="No clients need attention right now." accent="green" />
              ) : (
                <div className="flex flex-col gap-[5px]">
                  {attentionQueue.map((a, i) => <AlertCard key={`${a.clientId}-${a.alertType}-${i}`} alert={a} />)}
                  {attentionQueue.length > 4 && (
                    <p className="text-center" style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#2A2010", padding: "4px 0" }}>
                      + {attentionQueue.length - 4} more needing attention
                    </p>
                  )}
                </div>
              )}
            </Panel>

            {/* Recent Interventions */}
            <Panel>
              <SHdr title="Recent Interventions" badge={recentInterventions.length > 0 ? `${recentInterventions.length} today` : undefined} badgeAccent="green" />
              {recentInterventions.length === 0 ? (
                <Empty msg="No interventions recorded today." />
              ) : (
                <div>
                  {recentInterventions.map((item, idx) => (
                    <div key={`${item.clientId}-${idx}`} className="flex items-start gap-2.5" style={{ padding: "8px 0", borderBottom: idx < recentInterventions.length - 1 ? "1px solid #111" : "none" }}>
                      <span className="flex-shrink-0 rounded-full mt-1" style={{ width: "6px", height: "6px", background: "#1D9E75" }} />
                      <div className="flex-1 min-w-0">
                        <span style={{ fontFamily: G, fontSize: "13px", fontWeight: 600, color: "#F4EEE4" }}>{item.clientName}</span>
                        <p style={{ fontFamily: G, fontSize: "12px", fontStyle: "italic", color: "#807868" }}>
                          {intLabels[item.interventionType] ?? item.interventionType} — {item.interventionNote}
                        </p>
                      </div>
                      <span className="flex-shrink-0" style={{ fontFamily: C, fontSize: "6px", letterSpacing: "0.08em", color: "#2A2010", textTransform: "uppercase", marginTop: "2px" }}>{relTime(item.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Follow-Ups Due */}
            <Panel>
              <SHdr title="Follow-Ups Due" badge={followUpsDue.length > 0 ? `${followUpsDue.length} pending` : undefined} badgeAccent="gold" />
              {followUpsDue.length === 0 ? (
                <Empty msg="No follow-ups due in the next 24 hours." />
              ) : (
                <div>
                  {followUpsDue.map((item, idx) => {
                    const fu = new Date(item.followUpDate);
                    const overdue = fu.getTime() < Date.now();
                    const initials = item.clientName.split(" ").map((w) => w[0]).join("").slice(0, 2);
                    const accentColor = overdue ? "#7A1E1E" : "#B8933A";
                    return (
                      <div key={`${item.clientId}-${idx}`} className="flex items-center gap-2.5" style={{ padding: "9px 0", borderBottom: idx < followUpsDue.length - 1 ? "1px solid #111" : "none" }}>
                        <div className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: "28px", height: "28px", background: overdue ? "rgba(122,30,30,0.12)" : "rgba(184,147,58,0.1)", border: `1px solid ${overdue ? "#2A1010" : "#2A2010"}`, fontFamily: C, fontSize: "7.5px", fontWeight: 700, color: accentColor }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontFamily: G, fontSize: "13px", fontWeight: 600, color: "#F4EEE4", marginBottom: "1px" }}>{item.clientName}</div>
                          <div style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#807868" }}>
                            {item.coachNote ?? item.status.replace(/_/g, " ")}
                          </div>
                        </div>
                        <span className="flex-shrink-0 rounded-[3px]" style={{ fontFamily: C, fontSize: "7px", fontWeight: 700, padding: "2px 7px", color: accentColor, background: overdue ? "rgba(122,30,30,0.1)" : "rgba(184,147,58,0.08)", border: `1px solid ${overdue ? "#2A1010" : "#2A2010"}` }}>
                          {overdue ? "Overdue" : "Today"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────── */}
          <div className="flex flex-col gap-[8px]">

            {/* Roster Health */}
            <Panel>
              <SHdr title="Roster Health" subtitle="30-day window" />
              {clients.length === 0 ? (
                <Empty msg="No clients in roster." />
              ) : (
                <div>
                  {[...clients].sort((a, b) => {
                    const ga = a.statusLabel === "gone_dark" ? 0 : 1;
                    const gb = b.statusLabel === "gone_dark" ? 0 : 1;
                    if (ga !== gb) return ga - gb;
                    return (b.thirtyDayPct ?? 0) - (a.thirtyDayPct ?? 0);
                  }).slice(0, 8).map((c) => {
                    const pct = c.thirtyDayPct ?? 0;
                    const col = cColor(c.thirtyDayPct);
                    return (
                      <div key={c.id} className="flex items-center gap-2 mb-1">
                        <span className="truncate" style={{ fontFamily: G, fontSize: "12px", color: "#DDD5C0", minWidth: "90px" }}>{c.name}</span>
                        <div className="flex-1 h-[3px] rounded-[2px] overflow-hidden" style={{ background: "#1A1A1A" }}>
                          <div className="h-full rounded-[2px]" style={{ width: `${Math.min(pct, 100)}%`, background: col }} />
                        </div>
                        <span className="flex-shrink-0 text-right" style={{ fontFamily: C, fontSize: "8px", fontWeight: 700, color: col, minWidth: "28px" }}>
                          {c.thirtyDayPct !== null ? `${c.thirtyDayPct}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                  {clients.length > 8 && (
                    <a href="/coach/clients" className="no-underline block text-center hover:text-[#B8933A]" style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#2A2010", padding: "6px 0 0", cursor: "pointer" }}>
                      + {clients.length - 8} more clients →
                    </a>
                  )}
                </div>
              )}
            </Panel>

            {/* Pillar Breakdown */}
            <Panel>
              <SHdr title="Pillar Breakdown" subtitle="roster avg" />
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {pillarBreakdown.map((p) => {
                  const pct = p.avgPct;
                  const has = pct !== null && p.taskCount > 0;
                  const col = has ? cColor(pct) : "#2A2010";
                  return (
                    <div key={p.pillar} className="rounded-[4px] border text-center" style={{ background: "#0A0A0A", borderColor: has && pct! < 40 ? "#2A1010" : "#1A1A1A", padding: "9px 4px" }}>
                      <div style={{ fontFamily: C, fontSize: "16px", fontWeight: 900, color: col, lineHeight: 1, marginBottom: "2px" }}>
                        {has ? `${pct}%` : "—"}
                      </div>
                      <div style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, letterSpacing: "0.1em", color: col, textTransform: "uppercase" }}>
                        {p.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              {weakest && weakest.avgPct !== null && weakest.avgPct < 50 && (
                <p style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#807868", marginTop: "8px" }}>
                  {weakest.label} is the weakest pillar — consider roster-level intervention.
                </p>
              )}
            </Panel>

            {/* Compliance Trend */}
            <Panel>
              <SHdr title="Compliance Trend" subtitle="this week" />
              <div className="grid grid-cols-7 gap-[3px] mt-2">
                {weeklyTrend.map((d) => {
                  const pct = d.avgPct;
                  const has = pct !== null;
                  const bg = !has ? "#0A0A0A" : pct >= 70 ? "rgba(29,158,117,0.15)" : pct >= 40 ? "rgba(184,147,58,0.1)" : "rgba(122,30,30,0.1)";
                  const bc = !has ? "#1A1A1A" : pct >= 70 ? "#0D4A35" : pct >= 40 ? "#2A2010" : "#2A1010";
                  const tc = !has ? "#3A3020" : cColor(pct);
                  return (
                    <div key={d.date} className="rounded-[2px] border text-center" style={{ background: bg, borderColor: bc, padding: "4px 2px" }}>
                      <div style={{ fontFamily: C, fontSize: "6px", letterSpacing: "0.06em", color: tc, textTransform: "uppercase", marginBottom: "2px" }}>{d.dayLabel}</div>
                      <div style={{ fontFamily: C, fontSize: "7px", fontWeight: 700, color: tc }}>{has ? `${pct}%` : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Coach Insights */}
            <Panel>
              <SHdr title="Coach Insights" subtitle="deterministic signals" />
              {coachInsights.length === 0 ? (
                <Empty msg="No insights to display." />
              ) : (
                <div>
                  {coachInsights.map((ins, idx) => {
                    const dc: Record<string, string> = { green: "#1D9E75", gold: "#B8933A", crimson: "#7A1E1E" };
                    return (
                      <div key={idx} className="flex items-start gap-2" style={{ padding: "8px 0", borderBottom: idx < coachInsights.length - 1 ? "1px solid #111" : "none" }}>
                        <span className="flex-shrink-0 rounded-full mt-1" style={{ width: "5px", height: "5px", background: dc[ins.dot] ?? "#807868" }} />
                        <p style={{ fontFamily: G, fontSize: "12px", fontStyle: "italic", color: "#807868", lineHeight: 1.5 }}>{ins.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

function KPI({ label, sub, value, accent }: { label: string; sub: string; value: number; accent: "crimson" | "crimson-dim" | "gold" | "green" | "neutral" }) {
  const m: Record<string, { text: string; border: string; bg: string; sub: string; label: string }> = {
    crimson:     { text: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.1)", sub: "#3A1010", label: "#2A1010" },
    "crimson-dim": { text: "#7A1E1E", border: "#1E1010", bg: "rgba(122,30,30,0.06)", sub: "#1E1010", label: "#2A1010" },
    gold:        { text: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.07)", sub: "#2A2010", label: "#2A2010" },
    green:       { text: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.06)", sub: "#0D3A25", label: "#0D3A25" },
    neutral:     { text: "#4A3F2A", border: "#1A1A1A", bg: "rgba(74,63,42,0.07)", sub: "#1A1A0A", label: "#2A2010" },
  };
  const c = m[accent];
  return (
    <div className="rounded-[6px] border" style={{ background: c.bg, borderColor: c.border, padding: "8px 12px" }}>
      <div style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: c.label, marginBottom: "3px" }}>{label}</div>
      <div style={{ fontFamily: C, fontSize: "22px", fontWeight: 900, lineHeight: 1, color: c.text }}>{value}</div>
      <div style={{ fontFamily: G, fontSize: "8px", fontStyle: "italic", color: c.sub, marginTop: "1px" }}>{sub}</div>
    </div>
  );
}

function AlertCard({ alert: a }: { alert: DashboardAlert }) {
  const sc = a.statusLabel === "gone_dark" ? "#7A1E1E" : a.statusLabel === "critical" ? "#7A1E1E" : "#B8933A";
  const tl = atl(a.alertType);
  return (
    <div className="flex rounded-[5px] border overflow-hidden" style={{ background: "#0A0A0A", borderColor: "#1A1A1A" }}>
      <div className="flex-shrink-0" style={{ width: "3px", background: sc }} />
      <div className="flex-1 flex items-start gap-3" style={{ padding: "8px 11px" }}>
        <div className="flex-1 min-w-0">
          <div style={{ marginBottom: "2px" }}>
            <span style={{ fontFamily: G, fontSize: "14px", fontWeight: 600, color: "#F4EEE4" }}>{a.clientName}</span>
            {a.goalName && <span style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#4A3F2A", marginLeft: "6px" }}>{a.goalName}{a.goalCategory ? ` · ${a.goalCategory}` : ""}</span>}
          </div>
          <div className="flex flex-wrap gap-[3px] mb-1">
            {a.daysSinceActive !== null && a.daysSinceActive >= 3 && <Chip text={`${a.daysSinceActive} Days`} accent="r" />}
            {a.statusLabel === "gone_dark" && <Chip text="Gone Dark" accent="r" />}
            {a.todayPct !== null && <Chip text={`${a.todayPct}% Today`} accent={a.todayPct >= 70 ? "gr" : a.todayPct >= 40 ? "g" : "r"} />}
            {a.sevenDayPct !== null && <Chip text={`${a.sevenDayPct}% 7-Day`} accent={a.sevenDayPct >= 70 ? "gr" : a.sevenDayPct >= 40 ? "g" : "r"} />}
            {a.thirtyDayPct !== null && <Chip text={`${a.thirtyDayPct}% 30-Day`} accent={a.thirtyDayPct >= 70 ? "gr" : a.thirtyDayPct >= 40 ? "g" : "r"} />}
          </div>
          {a.interventionNote && <div style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#807868", lineHeight: 1.3 }}>{a.interventionNote}</div>}
          <div style={{ fontFamily: C, fontSize: "6px", letterSpacing: "0.08em", color: "#1E1A0A", textTransform: "uppercase", marginTop: "2px" }}>{tl} · {a.status.replace(/_/g, " ")}</div>
        </div>
        <div className="flex-shrink-0 flex flex-col gap-1 pt-0.5">
          <a href={`/coach/clients/${a.clientId}`} className="no-underline rounded-[3px] border text-center uppercase" style={{ fontFamily: C, fontSize: "6.5px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", whiteSpace: "nowrap", background: sc === "#7A1E1E" ? "rgba(122,30,30,0.12)" : "rgba(184,147,58,0.08)", borderColor: sc, color: sc, cursor: "pointer" }}>
            {a.statusLabel === "gone_dark" || a.statusLabel === "critical" ? "Call Now →" : a.status === "new" ? "Act Now →" : "View Profile →"}
          </a>
          <a href={`/coach/clients/${a.clientId}`} className="no-underline rounded-[3px] border text-center uppercase" style={{ fontFamily: C, fontSize: "6.5px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", background: "transparent", borderColor: "#1A1A1A", color: "#3A3020", cursor: "pointer" }}>
            View
          </a>
        </div>
      </div>
    </div>
  );
}

function Chip({ text, accent }: { text: string; accent: "r" | "g" | "gr" | "d" }) {
  const styles: Record<string, { color: string; bg: string; border: string }> = {
    r:  { color: "#7A1E1E", bg: "rgba(122,30,30,0.10)", border: "#2A1010" },
    g:  { color: "#B8933A", bg: "rgba(184,147,58,0.08)", border: "#2A2010" },
    gr: { color: "#1D9E75", bg: "rgba(29,158,117,0.08)", border: "#0D3A25" },
    d:  { color: "#2A2010", bg: "#0A0A0A", border: "#1A1A1A" },
  };
  const s = styles[accent];
  return (
    <span className="rounded-[2px] border uppercase" style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", padding: "1px 5px", color: s.color, background: s.bg, borderColor: s.border }}>
      {text}
    </span>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[7px] border" style={{ background: "#0D0D0D", borderColor: "#1A1A1A", padding: "12px 14px" }}>{children}</div>;
}

function SHdr({ title, badge, badgeAccent, subtitle }: { title: string; badge?: string; badgeAccent?: "crimson" | "gold" | "green"; subtitle?: string }) {
  const ba: Record<string, { color: string; bg: string; border: string }> = {
    crimson: { color: "#7A1E1E", bg: "rgba(122,30,30,0.1)", border: "#2A1010" },
    gold: { color: "#B8933A", bg: "rgba(184,147,58,0.08)", border: "#2A2010" },
    green: { color: "#1D9E75", bg: "rgba(29,158,117,0.08)", border: "#0D3A25" },
  };
  return (
    <div className="flex items-center justify-between mb-2">
      <span style={{ fontFamily: C, fontSize: "8px", fontWeight: 700, letterSpacing: "0.2em", color: "#2A2010", textTransform: "uppercase" }}>{title}</span>
      {badge && badgeAccent && (
        <span className="rounded-[3px] border" style={{ fontFamily: C, fontSize: "6px", fontWeight: 700, padding: "1px 6px", ...ba[badgeAccent] }}>{badge}</span>
      )}
      {subtitle && <span style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: "#2A2010" }}>{subtitle}</span>}
    </div>
  );
}

function Empty({ msg, accent }: { msg: string; accent?: "green" }) {
  return (
    <p className="text-center" style={{ fontFamily: G, fontSize: "11px", fontStyle: "italic", color: accent === "green" ? "#1D9E75" : "#2A2010", padding: "12px 0" }}>{msg}</p>
  );
}
