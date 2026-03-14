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
import { fetchAllClientsForCoach, fetchArchivedClientsForCoach } from "@/lib/server-queries";
import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import { AddClientModal } from "./AddClientModal";
import { ArchivedClientList } from "./ArchivedClientList";

export const dynamic = "force-dynamic";

function ComplianceBadge({ pct }: { pct: number }) {
  const cls =
    pct >= COMPLIANCE_TARGET ? "text-[#B8933A] border border-[#B8933A]" :
    pct >= 50 ? "text-[#C9A44A] border border-[#C9A44A]" :
                "text-[#7A1E1E] border border-[#7A1E1E]";
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded ${cls}`} style={{ fontFamily: "'Cinzel', serif" }}>
      {pct}%
    </span>
  );
}

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "archived" ? "archived" : "active";

  const [clients, archivedClients] = await Promise.all([
    fetchAllClientsForCoach(),
    fetchArchivedClientsForCoach(),
  ]);

  const onTrack = clients.filter((c) => !c.isFlagged).length;

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl text-[#F4EEE4] tracking-wide"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
          >
            Clients
          </h1>
          <p className="text-sm text-[#9A9080] mt-1">
            {clients.length} active &middot;{" "}
            <span className="text-[#B8933A] font-medium">{onTrack} on track</span>
            {clients.length - onTrack > 0 && (
              <> &middot; <span className="text-[#7A1E1E] font-medium">{clients.length - onTrack} flagged</span></>
            )}
          </p>
        </div>
        <AddClientModal />
      </div>

      {/* ── Tab bar ──────────────────────────────── */}
      <div className="flex gap-1 border-b border-[#252525]">
        <Link
          href="/coach/clients"
          className={`px-4 py-2 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px cursor-pointer ${
            tab === "active"
              ? "border-[#B8933A] text-[#B8933A]"
              : "border-transparent text-[#9A9080] hover:text-[#DDD5C0] hover:bg-[#1A1A1A]"
          }`}
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Active
          {clients.length > 0 && (
            <span className="ml-1.5 text-[#807868] font-normal">({clients.length})</span>
          )}
        </Link>
        <Link
          href="/coach/clients?tab=archived"
          className={`px-4 py-2 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px cursor-pointer ${
            tab === "archived"
              ? "border-[#B8933A] text-[#B8933A]"
              : "border-transparent text-[#9A9080] hover:text-[#DDD5C0] hover:bg-[#1A1A1A]"
          }`}
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Archived
          {archivedClients.length > 0 && (
            <span className="ml-1.5 text-[#807868] font-normal">({archivedClients.length})</span>
          )}
        </Link>
      </div>

      {/* ── Archived clients list ─────────────────── */}
      {tab === "archived" && (
        <ArchivedClientList initialClients={archivedClients} />
      )}

      {/* ── Active clients table ─────────────────── */}
      {tab === "active" && <div className="bg-[#141414] rounded border border-[#252525] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0D0D0D] border-b border-[#252525]">
              <th className="text-left text-xs uppercase tracking-wider text-[#9A9080] px-5 py-3 w-40" style={{ fontFamily: "'Cinzel', serif" }}>
                Client
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-[#9A9080] px-5 py-3" style={{ fontFamily: "'Cinzel', serif" }}>
                Goal
              </th>
              <th className="text-center text-xs uppercase tracking-wider text-[#9A9080] px-4 py-3 w-28" style={{ fontFamily: "'Cinzel', serif" }}>
                Progress
              </th>
              <th className="text-center text-xs uppercase tracking-wider text-[#9A9080] px-4 py-3 w-24" style={{ fontFamily: "'Cinzel', serif" }}>
                Today
              </th>
              <th className="text-center text-xs uppercase tracking-wider text-[#9A9080] px-4 py-3 w-24" style={{ fontFamily: "'Cinzel', serif" }}>
                7-Day
              </th>
              <th className="text-center text-xs uppercase tracking-wider text-[#9A9080] px-4 py-3 w-24" style={{ fontFamily: "'Cinzel', serif" }}>
                30-Day
              </th>
              <th className="text-center text-xs uppercase tracking-wider text-[#9A9080] px-4 py-3 w-32" style={{ fontFamily: "'Cinzel', serif" }}>
                Current Weight
              </th>
              <th className="text-center text-xs uppercase tracking-wider text-[#9A9080] px-4 py-3 w-36" style={{ fontFamily: "'Cinzel', serif" }}>
                Status
              </th>
              <th className="px-5 py-3 w-16" />
            </tr>
          </thead>

          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-14 text-center text-sm text-[#9A9080]">
                  No clients yet. Add clients in Supabase to get started.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className={`border-b border-[#252525] last:border-0 hover:bg-[#1A1A1A] transition-colors ${
                    client.isFlagged ? "border-l-4 border-l-[#7A1E1E]" : ""
                  }`}
                >
                  {/* Name */}
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#DDD5C0]">{client.name}</p>
                  </td>

                  {/* Goal */}
                  <td className="px-5 py-4">
                    <p className="text-sm text-[#9A9080] truncate max-w-xs">
                      {client.goalName ?? <span className="text-[#2E2E2E]">—</span>}
                    </p>
                  </td>

                  {/* Goal progress */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#DDD5C0]">
                        {client.goalProgress}%
                      </span>
                      <div className="w-20 h-1.5 bg-[#252525] rounded overflow-hidden">
                        <div
                          className="h-full bg-[#B8933A] rounded"
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
                    <span className="text-sm text-[#9A9080]">
                      {client.currentWeight != null
                        ? `${client.currentWeight} lbs`
                        : <span className="text-[#2E2E2E]">—</span>}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-4 text-center">
                    {client.isFlagged ? (
                      <span className="inline-block text-xs font-semibold text-[#7A1E1E] border border-[#7A1E1E] px-2.5 py-1 rounded" style={{ fontFamily: "'Cinzel', serif" }}>
                        Needs attention
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-semibold text-[#B8933A] border border-[#B8933A] px-2.5 py-1 rounded" style={{ fontFamily: "'Cinzel', serif" }}>
                        On track
                      </span>
                    )}
                  </td>

                  {/* View link */}
                  <td className="px-5 py-4 text-center">
                    <Link
                      href={`/coach/clients/${client.id}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-[#B8933A] hover:text-[#C9A44A] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>}

      {/* ── Legend (active tab only) ─────────────── */}
      {tab === "active" && (
        <div className="flex items-center gap-6 text-xs text-[#9A9080]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#B8933A] inline-block" /> ≥70% on track
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#C9A44A] inline-block" /> 50–69% at risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#7A1E1E] inline-block" /> &lt;50% critical
          </span>
          <span className="flex items-center gap-1.5 ml-4">
            <span className="w-3 h-1 rounded bg-[#7A1E1E] inline-block" /> Left border = flagged
          </span>
        </div>
      )}

    </div>
  );
}
