// ─────────────────────────────────────────────
// COACH DASHBOARD
//
// High-level overview of all client performance.
// Shows aggregate stats and flags clients who need attention.
//
// Server Component — fetches all data before render.
// Desktop-first layout, full-width within the coach layout shell.
// ─────────────────────────────────────────────

import Link from "next/link";
import { fetchAllClientsForCoach } from "@/lib/server-queries";
import type { CoachClientRow, HealthFlag } from "@/lib/server-queries";
import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";

const healthFlagLabels: Record<HealthFlag, string> = {
  low_readiness:          "Low Readiness",
  recovery_deficit:       "Recovery",
  high_stress_low_energy: "Stress",
  sleep_deficit:          "Sleep",
  nutrition_slip:         "Nutrition",
  training_gap:           "Training",
};

function HealthFlagBadges({ flags }: { flags: HealthFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <span
          key={flag}
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-[#7A1E1E] text-[#C94A4A] bg-[#7A1E1E]/10"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {healthFlagLabels[flag]}
        </span>
      ))}
    </div>
  );
}

// Always re-fetch — compliance data changes throughout the day.
export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────

function complianceClass(pct: number): string {
  if (pct >= COMPLIANCE_TARGET) return "text-[#B8933A] border border-[#B8933A]";
  if (pct >= 50) return "text-[#C9A44A] border border-[#C9A44A]";
  return "text-[#7A1E1E] border border-[#7A1E1E]";
}

function CompliancePill({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-sm font-semibold px-3 py-1 rounded ${complianceClass(pct)}`} style={{ fontFamily: "'Cinzel', serif" }}>
        {pct}%
      </span>
      <span className="text-xs text-[#9A9080]">{label}</span>
    </div>
  );
}

function FlaggedClientCard({ client }: { client: CoachClientRow }) {
  return (
    <div className="bg-[#0D0D0D] rounded-[7px] p-4 border border-[#1E1E1E] border-l-[3px] border-l-[#7A1E1E] flex flex-col gap-4">

      {/* Name + goal + view link */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[#DDD5C0] truncate" style={{ fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>{client.name}</p>
          <p className="text-xs text-[#9A9080] mt-0.5 truncate" style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
            {client.goalName ?? "No goal set"}
          </p>
        </div>
        <Link
          href={`/coach/clients/${client.id}`}
          className="text-xs font-medium text-[#B8933A] hover:text-[#C9A44A] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded whitespace-nowrap flex-shrink-0 cursor-pointer transition-all duration-150"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          View →
        </Link>
      </div>

      {/* Health flags */}
      <HealthFlagBadges flags={client.healthFlags} />

      {/* Compliance metrics */}
      <div className="flex items-center gap-4">
        <CompliancePill label="Today"  pct={client.todayPercent} />
        <CompliancePill label="7-Day"  pct={client.weekPercent}  />
        <CompliancePill label="30-Day" pct={client.monthPercent} />
      </div>

      {/* Goal progress bar */}
      {client.goalProgress > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#9A9080]">Goal progress</span>
            <span className="text-xs font-medium text-[#DDD5C0]">{client.goalProgress}%</span>
          </div>
          <div className="h-1.5 bg-[#252525] rounded overflow-hidden">
            <div
              className="h-full bg-[#B8933A] rounded transition-all duration-500"
              style={{ width: `${client.goalProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default async function CoachDashboard() {
  const clients = await fetchAllClientsForCoach();
  const flagged = clients.filter((c) => c.isFlagged);
  const healthFlaggedCount = clients.filter((c) => c.healthFlags.length > 0).length;

  // New clients = joined within the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newClients = clients.filter(
    (c) => new Date(c.createdAt) >= thirtyDaysAgo,
  );

  const total = clients.length;

  function avg(fn: (c: CoachClientRow) => number): number {
    return total > 0
      ? Math.round(clients.reduce((sum, c) => sum + fn(c), 0) / total)
      : 0;
  }

  const avgToday = avg((c) => c.todayPercent);
  const avgWeek  = avg((c) => c.weekPercent);
  const avgMonth = avg((c) => c.monthPercent);

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  return (
    <div className="space-y-8">

      {/* ── Page header ─────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[#F4EEE4]"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em" }}
          >
            Coach Dashboard
          </h1>
          <p className="mt-1" style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", fontStyle: "italic", color: "#4A3F2A" }}>{todayDate}</p>
        </div>
        <Link
          href="/coach/clients"
          className="text-[#B8933A] hover:text-[#C9A44A] border border-[#B8933A] hover:border-[#C9A44A] hover:bg-[#1A1A1A] rounded cursor-pointer transition-all duration-150 uppercase"
          style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", padding: "6px 12px", letterSpacing: "0.1em" }}
        >
          View All Clients →
        </Link>
      </div>

      {/* ── Summary stat cards ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">

        {/* Total clients */}
        <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1E1E1E]" style={{ padding: "12px 14px" }}>
          <p className="uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "9px" }}>
            Total Clients
          </p>
          <p className="text-[#DDD5C0]" style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900 }}>{total}</p>
        </div>

        {/* Today avg */}
        <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1E1E1E]" style={{ padding: "12px 14px" }}>
          <p className="uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "9px" }}>
            Today&apos;s Avg
          </p>
          <p className={avgToday >= COMPLIANCE_TARGET ? "text-[#B8933A]" : "text-[#7A1E1E]"} style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900 }}>
            {avgToday}<span className="text-[#9A9080]" style={{ fontSize: "14px", fontWeight: 500 }}>%</span>
          </p>
        </div>

        {/* 7-day avg */}
        <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1E1E1E]" style={{ padding: "12px 14px" }}>
          <p className="uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "9px" }}>
            7-Day Avg
          </p>
          <p className={avgWeek >= COMPLIANCE_TARGET ? "text-[#B8933A]" : "text-[#7A1E1E]"} style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900 }}>
            {avgWeek}<span className="text-[#9A9080]" style={{ fontSize: "14px", fontWeight: 500 }}>%</span>
          </p>
        </div>

        {/* 30-day avg */}
        <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1E1E1E]" style={{ padding: "12px 14px" }}>
          <p className="uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "9px" }}>
            30-Day Avg
          </p>
          <p className={avgMonth >= COMPLIANCE_TARGET ? "text-[#B8933A]" : "text-[#7A1E1E]"} style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900 }}>
            {avgMonth}<span className="text-[#9A9080]" style={{ fontSize: "14px", fontWeight: 500 }}>%</span>
          </p>
        </div>

        {/* Flagged */}
        <div className={`bg-[#0D0D0D] rounded-[7px] border ${flagged.length > 0 ? "border-[#7A1E1E]" : "border-[#1E1E1E]"}`} style={{ padding: "12px 14px" }}>
          <p className="uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "9px" }}>
            Flagged
          </p>
          <p className={flagged.length > 0 ? "text-[#7A1E1E]" : "text-[#DDD5C0]"} style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900 }}>
            {flagged.length}
          </p>
          <p className="text-[#807868] mt-1" style={{ fontSize: "10px" }}>below 70%</p>
        </div>

        {/* Health Alerts */}
        <div className={`bg-[#0D0D0D] rounded-[7px] border ${healthFlaggedCount > 0 ? "border-[#7A1E1E]" : "border-[#1E1E1E]"}`} style={{ padding: "12px 14px" }}>
          <p className="uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "9px" }}>
            Health Alerts
          </p>
          <p className={healthFlaggedCount > 0 ? "text-[#C94A4A]" : "text-[#DDD5C0]"} style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 900 }}>
            {healthFlaggedCount}
          </p>
          <p className="text-[#807868] mt-1" style={{ fontSize: "10px" }}>journal flags</p>
        </div>

      </div>

      {/* ── Clients needing attention ────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2
            className="text-[#F4EEE4] uppercase"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}
          >
            Clients Needing Attention
          </h2>
          {flagged.length === 0 ? (
            <span className="text-xs text-[#B8933A] border border-[#B8933A] px-3 py-1 rounded font-medium" style={{ fontFamily: "'Cinzel', serif" }}>
              All on track
            </span>
          ) : (
            <span className="text-xs text-[#7A1E1E] border border-[#7A1E1E] px-3 py-1 rounded font-medium" style={{ fontFamily: "'Cinzel', serif" }}>
              {flagged.length} client{flagged.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {flagged.length === 0 ? (
          <div className="bg-[#0D0D0D] rounded-[7px] p-10 border border-[#1E1E1E] text-center">
            <p className="text-[#DDD5C0] font-medium mb-1">All clients are on track</p>
            <p className="text-sm text-[#9A9080]">
              Everyone is above 70% compliance across all timeframes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {flagged.map((client) => (
              <FlaggedClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </section>

      {/* ── New Clients (first 30 days) ──────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2
            className="text-[#F4EEE4] uppercase"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}
          >
            New Clients
          </h2>
          <span className="text-xs text-[#9A9080]">
            joined in the last 30 days
          </span>
          {newClients.length > 0 && (
            <span className="text-xs text-[#B8933A] border border-[#B8933A] px-3 py-1 rounded font-medium ml-auto" style={{ fontFamily: "'Cinzel', serif" }}>
              {newClients.length} new
            </span>
          )}
        </div>

        {newClients.length === 0 ? (
          <div className="bg-[#0D0D0D] rounded-[7px] p-10 border border-[#1E1E1E] text-center">
            <p className="text-[#DDD5C0] font-medium mb-1">No new clients this month</p>
            <p className="text-sm text-[#9A9080]">
              Clients added in the last 30 days will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {newClients.map((client) => (
              <div
                key={client.id}
                className="bg-[#0D0D0D] rounded-[7px] p-4 border border-[#1E1E1E] flex flex-col gap-4"
              >
                {/* Name + goal + view link */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#DDD5C0] truncate" style={{ fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>{client.name}</p>
                    <p className="text-[#9A9080] mt-0.5 truncate" style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: "12px" }}>
                      {client.goalName ?? "No goal set"}
                    </p>
                    <p className="text-xs text-[#9A9080] mt-1">
                      Joined {new Date(client.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/coach/clients/${client.id}`}
                    className="text-xs font-medium text-[#B8933A] hover:text-[#C9A44A] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded whitespace-nowrap flex-shrink-0 cursor-pointer transition-all duration-150"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    View →
                  </Link>
                </div>

                {/* Health flags */}
                <HealthFlagBadges flags={client.healthFlags} />

                {/* Compliance pills */}
                <div className="flex items-center gap-4">
                  <CompliancePill label="Today"  pct={client.todayPercent} />
                  <CompliancePill label="7-Day"  pct={client.weekPercent}  />
                  <CompliancePill label="30-Day" pct={client.monthPercent} />
                </div>

                {/* Goal progress bar */}
                {client.goalProgress > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#9A9080]">Goal progress</span>
                      <span className="text-xs font-medium text-[#DDD5C0]">{client.goalProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-[#252525] rounded overflow-hidden">
                      <div
                        className="h-full bg-[#B8933A] rounded transition-all duration-500"
                        style={{ width: `${client.goalProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status badge */}
                <div>
                  {client.isFlagged ? (
                    <span className="text-xs font-semibold text-[#7A1E1E] border border-[#7A1E1E] px-2.5 py-1 rounded" style={{ fontFamily: "'Cinzel', serif" }}>
                      Needs attention
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#B8933A] border border-[#B8933A] px-2.5 py-1 rounded" style={{ fontFamily: "'Cinzel', serif" }}>
                      On track
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
