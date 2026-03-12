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
import type { CoachClientRow } from "@/lib/server-queries";

// Always re-fetch — compliance data changes throughout the day.
export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────

function complianceClass(pct: number): string {
  if (pct >= 70) return "text-[#B8933A] border border-[#B8933A]";
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
    <div className="bg-[#141414] rounded p-5 border border-[#252525] flex flex-col gap-4">

      {/* Name + goal + view link */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[#DDD5C0] truncate">{client.name}</p>
          <p className="text-xs text-[#9A9080] mt-0.5 truncate">
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
            className="text-2xl text-[#F4EEE4] tracking-wide"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
          >
            Coach Dashboard
          </h1>
          <p className="text-sm text-[#9A9080] mt-1">{todayDate}</p>
        </div>
        <Link
          href="/coach/clients"
          className="text-sm font-medium text-[#B8933A] hover:text-[#C9A44A] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          View all clients →
        </Link>
      </div>

      {/* ── Summary stat cards ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* Total clients */}
        <div className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            Total Clients
          </p>
          <p className="text-3xl font-bold text-[#DDD5C0]">{total}</p>
        </div>

        {/* Today avg */}
        <div className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            Today&apos;s Avg
          </p>
          <p className={`text-3xl font-bold ${avgToday >= 70 ? "text-[#B8933A]" : "text-[#7A1E1E]"}`}>
            {avgToday}<span className="text-xl font-medium text-[#9A9080]">%</span>
          </p>
        </div>

        {/* 7-day avg */}
        <div className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            7-Day Avg
          </p>
          <p className={`text-3xl font-bold ${avgWeek >= 70 ? "text-[#B8933A]" : "text-[#7A1E1E]"}`}>
            {avgWeek}<span className="text-xl font-medium text-[#9A9080]">%</span>
          </p>
        </div>

        {/* 30-day avg */}
        <div className="bg-[#141414] rounded p-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            30-Day Avg
          </p>
          <p className={`text-3xl font-bold ${avgMonth >= 70 ? "text-[#B8933A]" : "text-[#7A1E1E]"}`}>
            {avgMonth}<span className="text-xl font-medium text-[#9A9080]">%</span>
          </p>
        </div>

        {/* Flagged */}
        <div className={`bg-[#141414] rounded p-5 border ${flagged.length > 0 ? "border-[#7A1E1E]" : "border-[#252525]"}`}>
          <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            Flagged
          </p>
          <p className={`text-3xl font-bold ${flagged.length > 0 ? "text-[#7A1E1E]" : "text-[#DDD5C0]"}`}>
            {flagged.length}
          </p>
          <p className="text-xs text-[#807868] mt-1">below 70%</p>
        </div>

      </div>

      {/* ── Clients needing attention ────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2
            className="text-base text-[#F4EEE4] tracking-wide"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
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
          <div className="bg-[#141414] rounded p-10 border border-[#252525] text-center">
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
            className="text-base text-[#F4EEE4] tracking-wide"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
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
          <div className="bg-[#141414] rounded p-10 border border-[#252525] text-center">
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
                className="bg-[#141414] rounded p-5 border border-[#252525] flex flex-col gap-4"
              >
                {/* Name + goal + view link */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#DDD5C0] truncate">{client.name}</p>
                    <p className="text-xs text-[#9A9080] mt-0.5 truncate">
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
