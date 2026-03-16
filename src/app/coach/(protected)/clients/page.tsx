// ─────────────────────────────────────────────
// COACH — All Clients
//
// Responsive card grid of every client with compliance
// metrics, goal progress, health flags, and current weight.
// Cards link to /coach/clients/[id].
//
// Server Component — card-grid layout.
// ─────────────────────────────────────────────

import Link from "next/link";
import { fetchAllClientsForCoach, fetchArchivedClientsForCoach } from "@/lib/server-queries";
import { ClientCard } from "@/components/coach/ClientCard";
import { AddClientModal } from "./AddClientModal";
import { ArchivedClientList } from "./ArchivedClientList";

export const dynamic = "force-dynamic";

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; add?: string }>;
}) {
  const { tab: tabParam, add: addParam } = await searchParams;
  const tab = tabParam === "archived" ? "archived" : "active";
  const autoOpenAdd = addParam === "true";

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
            className="text-[#F4EEE4]"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em" }}
          >
            Clients
          </h1>
          <p className="mt-1" style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", fontStyle: "italic", color: "#4A3F2A" }}>
            {clients.length} active &middot;{" "}
            <span className="text-[#B8933A] font-medium">{onTrack} on track</span>
            {clients.length - onTrack > 0 && (
              <> &middot; <span className="text-[#7A1E1E] font-medium">{clients.length - onTrack} flagged</span></>
            )}
          </p>
        </div>
        <AddClientModal autoOpen={autoOpenAdd} />
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

      {/* ── Active clients card grid ─────────────── */}
      {tab === "active" && (
        clients.length === 0 ? (
          <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] py-14 px-6 text-center">
            <p
              className="text-[#807868]"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "13px", fontStyle: "italic" }}
            >
              No clients yet.
            </p>
            <a
              href="/coach/clients?add=true"
              className="inline-block mt-4 text-[#F4EEE4] bg-[#B8933A] hover:bg-[#C9A44A] rounded-[5px] transition-colors cursor-pointer uppercase no-underline"
              style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", padding: "7px 14px" }}
            >
              + Add Client
            </a>
          </div>
        ) : (
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}
          >
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )
      )}

    </div>
  );
}
