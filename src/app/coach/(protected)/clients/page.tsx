// ─────────────────────────────────────────────
// COACH — All Clients
//
// Full table of every client with compliance metrics,
// goal progress, and current weight.
// Rows link to /coach/clients/[id] (Phase 2: client profile).
//
// Server Component — desktop-first layout.
// ─────────────────────────────────────────────

import Link from "next/link";
import { fetchAllClientsForCoach } from "@/lib/server-queries";
import { AddClientModal } from "./AddClientModal";

export const dynamic = "force-dynamic";

function ComplianceBadge({ pct }: { pct: number }) {
  const cls =
    pct >= 70 ? "bg-green-100 text-green-700" :
    pct >= 50 ? "bg-amber-100 text-amber-700" :
                "bg-red-100   text-red-700";
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {pct}%
    </span>
  );
}

export default async function ClientsListPage() {
  const clients = await fetchAllClientsForCoach();

  const onTrack = clients.filter((c) => !c.isFlagged).length;

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Clients</h1>
          <p className="text-sm text-gray-400 mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""} &middot;{" "}
            <span className="text-green-600 font-medium">{onTrack} on track</span>
            {clients.length - onTrack > 0 && (
              <> &middot; <span className="text-red-500 font-medium">{clients.length - onTrack} flagged</span></>
            )}
          </p>
        </div>
        <AddClientModal />
      </div>

      {/* ── Clients table ───────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3 w-40">
                Client
              </th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">
                Goal
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 w-28">
                Progress
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 w-24">
                Today
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 w-24">
                7-Day
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 w-24">
                30-Day
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 w-32">
                Current Weight
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 w-36">
                Status
              </th>
              <th className="px-5 py-3 w-16" />
            </tr>
          </thead>

          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-14 text-center text-sm text-gray-400">
                  No clients yet. Add clients in Supabase to get started.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    client.isFlagged ? "border-l-4 border-l-red-300" : ""
                  }`}
                >
                  {/* Name */}
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{client.name}</p>
                  </td>

                  {/* Goal */}
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-600 truncate max-w-xs">
                      {client.goalName ?? <span className="text-gray-300">—</span>}
                    </p>
                  </td>

                  {/* Goal progress */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-700">
                        {client.goalProgress}%
                      </span>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${client.goalProgress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Compliance columns */}
                  <td className="px-4 py-4 text-center">
                    <ComplianceBadge pct={client.todayPercent} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <ComplianceBadge pct={client.weekPercent} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <ComplianceBadge pct={client.monthPercent} />
                  </td>

                  {/* Current weight */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-600">
                      {client.currentWeight != null
                        ? `${client.currentWeight} lbs`
                        : <span className="text-gray-300">—</span>}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-4 text-center">
                    {client.isFlagged ? (
                      <span className="inline-block text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
                        Needs attention
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-semibold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">
                        On track
                      </span>
                    )}
                  </td>

                  {/* View link (Phase 2: opens client profile) */}
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/coach/clients/${client.id}`}
                      className="text-xs font-medium text-blue-500 hover:text-blue-600"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Legend ──────────────────────────────── */}
      <div className="flex items-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-200 inline-block" /> ≥70% on track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-200 inline-block" /> 50–69% at risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-200 inline-block" /> &lt;50% critical
        </span>
        <span className="flex items-center gap-1.5 ml-4">
          <span className="w-3 h-1 rounded-full bg-red-300 inline-block" /> Left border = flagged
        </span>
      </div>

    </div>
  );
}
