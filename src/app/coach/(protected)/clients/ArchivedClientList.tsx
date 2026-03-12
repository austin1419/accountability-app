"use client";

// ─────────────────────────────────────────────
// ArchivedClientList
//
// Displays archived clients with Re-Activate and Permanently Delete actions.
// ─────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import type { ArchivedClientRow } from "@/lib/server-queries";
import { reactivateClient, permanentlyDeleteClient } from "./[id]/actions";

export function ArchivedClientList({
  initialClients,
}: {
  initialClients: ArchivedClientRow[];
}) {
  const [clients,       setClients]       = useState<ArchivedClientRow[]>(initialClients);
  const [loadingId,     setLoadingId]     = useState<string | null>(null);
  const [errorId,       setErrorId]       = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleReactivate(clientId: string) {
    setLoadingId(clientId);
    setErrorId(null);
    const result = await reactivateClient(clientId);
    if (result.error) {
      setErrorId(clientId);
      setLoadingId(null);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setLoadingId(null);
  }

  async function handlePermanentDelete(clientId: string) {
    setLoadingId(clientId);
    setErrorId(null);
    const result = await permanentlyDeleteClient(clientId);
    if (result.error) {
      setErrorId(clientId);
      setLoadingId(null);
      setConfirmDeleteId(null);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setLoadingId(null);
    setConfirmDeleteId(null);
  }

  if (clients.length === 0) {
    return (
      <div className="bg-[#141414] rounded border border-[#252525] px-5 py-14 text-center text-sm text-[#9A9080]">
        No archived clients.
      </div>
    );
  }

  return (
    <div className="bg-[#141414] rounded border border-[#252525] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-[#0D0D0D] border-b border-[#252525]">
            <th className="text-left text-xs uppercase tracking-wider text-[#9A9080] px-5 py-3" style={{ fontFamily: "'Cinzel', serif" }}>
              Client
            </th>
            <th className="text-left text-xs uppercase tracking-wider text-[#9A9080] px-5 py-3" style={{ fontFamily: "'Cinzel', serif" }}>
              Goal
            </th>
            <th className="text-left text-xs uppercase tracking-wider text-[#9A9080] px-5 py-3" style={{ fontFamily: "'Cinzel', serif" }}>
              Archive Reason
            </th>
            <th className="px-5 py-3 w-52" />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-[#252525] last:border-0 hover:bg-[#1A1A1A] transition-colors">
              <td className="px-5 py-4">
                <p className="font-medium text-[#DDD5C0]">{client.name}</p>
                <p className="text-xs text-[#9A9080]">{client.email}</p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-[#9A9080]">
                  {client.goalName ?? <span className="text-[#2E2E2E]">—</span>}
                </p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-[#807868] italic">
                  {client.archiveReason ?? <span className="not-italic text-[#2E2E2E]">—</span>}
                </p>
              </td>
              <td className="px-5 py-4 text-right">
                {confirmDeleteId === client.id ? (
                  // ── Confirmation state ──────────────────
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-[#9A9080] text-right max-w-[220px]">
                      Permanently delete <strong className="text-[#DDD5C0]">{client.name}</strong> and all their data? This cannot be undone.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={loadingId === client.id}
                        className="text-xs font-semibold text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(client.id)}
                        disabled={loadingId === client.id}
                        className="text-xs font-semibold text-[#F4EEE4] bg-[#7A1E1E] hover:bg-[#8C2424] border border-[#7A1E1E] hover:border-[#8C2424] disabled:opacity-50 px-3 py-1.5 rounded cursor-pointer transition-all duration-150"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        {loadingId === client.id ? "Deleting…" : "Delete Permanently"}
                      </button>
                    </div>
                    {errorId === client.id && (
                      <span className="text-xs text-[#7A1E1E]">Failed — try again</span>
                    )}
                  </div>
                ) : (
                  // ── Default action buttons ──────────────
                  <div className="flex items-center justify-end gap-2">
                    {errorId === client.id && (
                      <span className="text-xs text-[#7A1E1E]">Failed — try again</span>
                    )}
                    <button
                      onClick={() => handleReactivate(client.id)}
                      disabled={loadingId === client.id}
                      className="text-xs font-semibold text-[#B8933A] hover:text-[#C9A44A] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150 disabled:opacity-50"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      {loadingId === client.id ? "Reactivating…" : "Re-Activate Client"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(client.id)}
                      disabled={loadingId === client.id}
                      className="text-xs font-semibold text-[#9A9080] hover:text-[#7A1E1E] border border-[#252525] hover:border-[#7A1E1E] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <Link
                      href={`/coach/clients/${client.id}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-[#B8933A] hover:text-[#C9A44A] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      View →
                    </Link>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
