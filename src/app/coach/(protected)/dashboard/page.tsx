// ─────────────────────────────────────────────
// COACH DASHBOARD — War Room (RPC-powered)
//
// Full triage view powered by get_coach_dashboard().
// Single RPC call returns roster, alerts, counts,
// and priority clients in one round-trip.
//
// Server Component — fetches all data before render.
// ─────────────────────────────────────────────

import { getCoachDashboard } from "@/lib/supabase/queries/getCoachDashboard";
import type { CoachAlert } from "@/lib/supabase/queries/getCoachDashboard";

import { AmbientBar } from "@/components/coach/AmbientBar";
import { RosterScorecard } from "@/components/coach/RosterScorecard";
import { PriorityStrip } from "@/components/coach/PriorityStrip";
import { RosterHealthBar } from "@/components/coach/RosterHealthBar";
import { ClientAlertCard } from "@/components/coach/ClientAlertCard";
import { ClientTrendCard } from "@/components/coach/ClientTrendCard";
import { ClientWinCard } from "@/components/coach/ClientWinCard";

export const dynamic = "force-dynamic";

const TEMP_COACH_ID = "fb4bb26f-434e-4511-aa1e-b4c34146f510";

// ── Page ─────────────────────────────────────────────────────────

export default async function CoachDashboardPage() {
  const dashboard = await getCoachDashboard(TEMP_COACH_ID);
  const { roster_snapshot, alerts, counts } = dashboard;

  // Map payload field names to design names
  const thriving = counts.good;
  const atRisk = counts.warning;
  const { critical, total } = counts;

  // Build alert lookup by client_id
  const alertsByClient = new Map<string, CoachAlert[]>();
  for (const a of alerts) {
    const existing = alertsByClient.get(a.client_id) ?? [];
    existing.push(a);
    alertsByClient.set(a.client_id, existing);
  }

  // ── Column populations (display-layer only) ──

  // Column 1: Needs Attention — critical + gone_dark first, then priority_clients
  const needsAttention = roster_snapshot
    .filter((c) => c.status_label === "critical" || c.status_label === "gone_dark")
    .sort((a, b) => {
      const prioA = a.status_label === "critical" ? 0 : 1;
      const prioB = b.status_label === "critical" ? 0 : 1;
      return prioA - prioB;
    })
    .slice(0, 4);

  // Column 2: Trending to Risk — at_risk clients sorted by largest negative delta
  const trendingToRisk = roster_snapshot
    .filter((c) => c.status_label === "at_risk")
    .sort((a, b) => (a.seven_day_pct - a.thirty_day_pct) - (b.seven_day_pct - b.thirty_day_pct))
    .slice(0, 4);

  // Column 3: Thriving — sorted by thirty_day_pct desc (streak/goal_completed not in payload)
  const thrivingClients = roster_snapshot
    .filter((c) => c.status_label === "thriving")
    .sort((a, b) => b.thirty_day_pct - a.thirty_day_pct)
    .slice(0, 4);

  // Formatted date
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="-mx-6 -mt-8 lg:-mx-8">

      {/* ── ZONE 1: AmbientBar ─────────────────── */}
      <AmbientBar thriving={thriving} atRisk={atRisk} critical={critical} total={total} />

      {/* ── ZONE 2: Dashboard Action Bar ─────────── */}
      {/* Title "War Room" comes from the shared CoachTopBar. */}
      {/* This bar adds the scorecard + action button below it. */}
      <div
        className="flex items-center justify-between border-b border-[#1A1A1A]"
        style={{ background: "#0A0A0A", padding: "6px 18px" }}
      >
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          {todayDate} — {total} active client{total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3">
          <RosterScorecard thriving={thriving} atRisk={atRisk} critical={critical} />
          <a
            href="/coach/clients?add=true"
            className="text-[#F4EEE4] bg-[#B8933A] hover:bg-[#C9A44A] rounded-[5px] transition-colors cursor-pointer uppercase no-underline"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", padding: "7px 14px" }}
          >
            + Add Client
          </a>
        </div>
      </div>

      {/* ── ZONE 3: PriorityStrip ──────────────── */}
      <PriorityStrip alerts={alerts} />

      {/* ── ZONE 4: Page Content ───────────────── */}
      <div style={{ padding: "18px" }}>

        {/* 4a. RosterHealthBar */}
        <div className="mb-6">
          <RosterHealthBar thriving={thriving} atRisk={atRisk} critical={critical} total={total} />
        </div>

        {/* 4b. Three-column work surface */}
        {/* align-start prevents empty columns from stretching to match filled ones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 items-start" style={{ gap: "9px" }}>

          {/* ── Column 1: Needs Attention ──────── */}
          <section>
            <ColumnHeader
              title="Needs Attention"
              count={needsAttention.length}
              accent="red"
            />
            {needsAttention.length === 0 ? (
              <EmptyColumn message="All clients on track." accent="green" />
            ) : (
              <div className="flex flex-col gap-2">
                {needsAttention.map((client) => (
                  <ClientAlertCard
                    key={client.client_id}
                    client={client}
                    alerts={alertsByClient.get(client.client_id) ?? []}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Column 2: Trending to Risk ─────── */}
          <section>
            <ColumnHeader
              title="Trending to Risk"
              count={trendingToRisk.length}
              accent="gold"
            />
            {trendingToRisk.length === 0 ? (
              <EmptyColumn message="No declining trends." accent="default" />
            ) : (
              <div className="flex flex-col gap-2">
                {trendingToRisk.map((client) => (
                  <ClientTrendCard key={client.client_id} client={client} />
                ))}
              </div>
            )}
          </section>

          {/* ── Column 3: Thriving ─────────────── */}
          <section>
            <ColumnHeader
              title="Thriving"
              count={thrivingClients.length}
              accent="green"
            />
            {thrivingClients.length === 0 ? (
              <EmptyColumn message="No thriving clients yet." accent="default" />
            ) : (
              <div className="flex flex-col gap-2">
                {thrivingClients.map((client) => (
                  <ClientWinCard key={client.client_id} client={client} />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function ColumnHeader({ title, count, accent }: { title: string; count: number; accent: "red" | "gold" | "green" }) {
  const badgeColor = {
    red:   "text-[#7A1E1E] border-[#2A1010] bg-[rgba(122,30,30,0.10)]",
    gold:  "text-[#B8933A] border-[#2A2010] bg-[rgba(184,147,58,0.08)]",
    green: "text-[#1D9E75] border-[#0D3A25] bg-[rgba(29,158,117,0.08)]",
  }[accent];

  return (
    <div className="flex items-center gap-2 mb-3">
      <h3
        className="text-[#F4EEE4] uppercase"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}
      >
        {title}
      </h3>
      {count > 0 && (
        <span
          className={`rounded border px-1.5 py-0.5 ${badgeColor}`}
          style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700 }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyColumn({ message, accent = "default" }: { message: string; accent?: "green" | "default" }) {
  const borderClass = accent === "green" ? "border-[#0D3A25]" : "border-[#1A1A1A]";
  const textColor = accent === "green" ? "#1D9E75" : "#4A3F2A";
  return (
    <div className={`bg-[#0D0D0D] rounded-[7px] border ${borderClass} py-5 px-4 text-center`}>
      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: textColor }}>
        {message}
      </p>
    </div>
  );
}
