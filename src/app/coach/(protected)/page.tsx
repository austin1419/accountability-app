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
  if (pct >= 70) return "bg-green-100 text-green-700";
  if (pct >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function CompliancePill({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${complianceClass(pct)}`}>
        {pct}%
      </span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function FlaggedClientCard({ client }: { client: CoachClientRow }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">

      {/* Name + goal + view link */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{client.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {client.goalName ?? "No goal set"}
          </p>
        </div>
        <Link
          href={`/coach/clients/${client.id}`}
          className="text-xs font-medium text-blue-500 hover:text-blue-600 whitespace-nowrap flex-shrink-0 mt-0.5"
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
            <span className="text-xs text-gray-400">Goal progress</span>
            <span className="text-xs font-medium text-gray-600">{client.goalProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-500"
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
          <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">{todayDate}</p>
        </div>
        <Link
          href="/coach/clients"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all clients →
        </Link>
      </div>

      {/* ── Summary stat cards ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* Total clients */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Total Clients
          </p>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
        </div>

        {/* Today avg */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Today&apos;s Avg
          </p>
          <p className={`text-3xl font-bold ${avgToday >= 70 ? "text-green-600" : "text-amber-500"}`}>
            {avgToday}<span className="text-xl font-medium text-gray-400">%</span>
          </p>
        </div>

        {/* 7-day avg */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            7-Day Avg
          </p>
          <p className={`text-3xl font-bold ${avgWeek >= 70 ? "text-green-600" : "text-amber-500"}`}>
            {avgWeek}<span className="text-xl font-medium text-gray-400">%</span>
          </p>
        </div>

        {/* 30-day avg */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            30-Day Avg
          </p>
          <p className={`text-3xl font-bold ${avgMonth >= 70 ? "text-green-600" : "text-amber-500"}`}>
            {avgMonth}<span className="text-xl font-medium text-gray-400">%</span>
          </p>
        </div>

        {/* Flagged */}
        <div className={`bg-white rounded-2xl p-5 shadow-sm border ${flagged.length > 0 ? "border-red-200" : "border-gray-100"}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Flagged
          </p>
          <p className={`text-3xl font-bold ${flagged.length > 0 ? "text-red-600" : "text-gray-900"}`}>
            {flagged.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">below 70%</p>
        </div>

      </div>

      {/* ── Clients needing attention ────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Clients Needing Attention
          </h2>
          {flagged.length === 0 ? (
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              All on track
            </span>
          ) : (
            <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
              {flagged.length} client{flagged.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {flagged.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-900 font-medium mb-1">All clients are on track</p>
            <p className="text-sm text-gray-400">
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
          <h2 className="text-base font-semibold text-gray-900">New Clients</h2>
          <span className="text-xs text-gray-400 font-medium">
            joined in the last 30 days
          </span>
          {newClients.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium ml-auto">
              {newClients.length} new
            </span>
          )}
        </div>

        {newClients.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-900 font-medium mb-1">No new clients this month</p>
            <p className="text-sm text-gray-400">
              Clients added in the last 30 days will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {newClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4"
              >
                {/* Name + goal + view link */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {client.goalName ?? "No goal set"}
                    </p>
                    <p className="text-xs text-blue-400 mt-1">
                      Joined {new Date(client.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/coach/clients/${client.id}`}
                    className="text-xs font-medium text-blue-500 hover:text-blue-600 whitespace-nowrap flex-shrink-0 mt-0.5"
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
                      <span className="text-xs text-gray-400">Goal progress</span>
                      <span className="text-xs font-medium text-gray-600">{client.goalProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${client.goalProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status badge */}
                <div>
                  {client.isFlagged ? (
                    <span className="text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
                      Needs attention
                    </span>
                  ) : (
                    <span className="text-xs font-semibold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">
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
