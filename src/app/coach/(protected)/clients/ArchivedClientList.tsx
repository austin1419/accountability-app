"use client";

// ─────────────────────────────────────────────
// ArchivedClientList
//
// Displays archived clients with a Re-Activate button.
// Removes reactivated rows from local state immediately,
// then persists via server action.
// ─────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import type { ArchivedClientRow } from "@/lib/server-queries";
import { reactivateClient } from "./[id]/actions";

export function ArchivedClientList({
  initialClients,
}: {
  initialClients: ArchivedClientRow[];
}) {
  const [clients,    setClients]    = useState<ArchivedClientRow[]>(initialClients);
  const [loadingId,  setLoadingId]  = useState<string | null>(null);
  const [errorId,    setErrorId]    = useState<string | null>(null);

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

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-14 text-center text-sm text-gray-400">
        No archived clients.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">
              Client
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">
              Goal
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">
              Archive Reason
            </th>
            <th className="px-5 py-3 w-40" />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-5 py-4">
                <p className="font-medium text-gray-900">{client.name}</p>
                <p className="text-xs text-gray-400">{client.email}</p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-gray-600">
                  {client.goalName ?? <span className="text-gray-300">—</span>}
                </p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-gray-500 italic">
                  {client.archiveReason ?? <span className="not-italic text-gray-300">—</span>}
                </p>
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-4">
                  {errorId === client.id && (
                    <span className="text-xs text-red-500">Failed — try again</span>
                  )}
                  <button
                    onClick={() => handleReactivate(client.id)}
                    disabled={loadingId === client.id}
                    className="text-xs font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {loadingId === client.id ? "Reactivating…" : "Re-Activate Client"}
                  </button>
                  <Link
                    href={`/coach/clients/${client.id}`}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600"
                  >
                    View →
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
