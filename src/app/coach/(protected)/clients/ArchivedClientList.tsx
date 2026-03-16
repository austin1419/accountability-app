"use client";

// ─────────────────────────────────────────────
// ArchivedClientList
//
// Displays archived clients with three actions:
// - Re-Activate Client
// - Remove (soft delete — hides from coach view)
// - Permanent Delete (full purge with email confirmation)
// ─────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import type { ArchivedClientRow } from "@/lib/server-queries";
import { reactivateClient, permanentlyDeleteClient } from "./[id]/actions";
import { PermanentDeleteConfirm } from "./PermanentDeleteConfirm";

export function ArchivedClientList({
  initialClients,
}: {
  initialClients: ArchivedClientRow[];
}) {
  const [clients, setClients] = useState<ArchivedClientRow[]>(initialClients);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [softDeleteId, setSoftDeleteId] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);

  async function handleReactivate(clientId: string) {
    setLoadingId(clientId);
    setErrorId(null);
    setErrorMsg(null);
    const result = await reactivateClient(clientId);
    if (result.error) {
      setErrorId(clientId);
      setErrorMsg(result.error);
      setLoadingId(null);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setLoadingId(null);
  }

  async function handleSoftDelete(clientId: string) {
    setLoadingId(clientId);
    setErrorId(null);
    setErrorMsg(null);
    const result = await permanentlyDeleteClient(clientId);
    if (result.error) {
      setErrorId(clientId);
      setErrorMsg(result.error);
      setLoadingId(null);
      setSoftDeleteId(null);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setLoadingId(null);
    setSoftDeleteId(null);
  }

  function handlePurgeSuccess(clientId: string) {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setPurgeId(null);
  }

  if (clients.length === 0) {
    return (
      <div className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A] px-5 py-14 text-center">
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", fontStyle: "italic", color: "#4A3F2A" }}>
          No archived clients.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[7px]">
      {clients.map((client) => {
        const isLoading = loadingId === client.id;
        const showSoftConfirm = softDeleteId === client.id;
        const showPurge = purgeId === client.id;

        return (
          <div
            key={client.id}
            className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
            style={{ padding: "12px 16px" }}
          >
            {/* Client info row */}
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="min-w-0">
                <span
                  className="truncate block"
                  style={{ fontFamily: "'EB Garamond', serif", fontSize: "14px", fontWeight: 600, color: "#DDD5C0" }}
                >
                  {client.name}
                </span>
                <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", color: "#807868" }}>
                  {client.email}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {client.goalName && (
                  <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
                    {client.goalName}
                  </span>
                )}
                {client.archiveReason && (
                  <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "10px", fontStyle: "italic", color: "#807868" }}>
                    · {client.archiveReason}
                  </span>
                )}
              </div>
            </div>

            {/* Error display */}
            {errorId === client.id && errorMsg && (
              <p className="mb-2" style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", color: "#7A1E1E" }}>
                {errorMsg}
              </p>
            )}

            {/* Soft delete confirmation */}
            {showSoftConfirm && (
              <div
                className="rounded-[5px] border border-[#2A2010] mb-2"
                style={{ background: "rgba(184,147,58,0.08)", padding: "8px 10px" }}
              >
                <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", color: "#DDD5C0", marginBottom: "6px" }}>
                  Remove <strong>{client.name}</strong> from your coaching view? Their data will be preserved but hidden.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSoftDelete(client.id)}
                    className="rounded border uppercase transition-colors disabled:opacity-50"
                    style={{
                      fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                      color: "#B8933A", borderColor: "#2A2010", background: "transparent",
                      padding: "3px 8px", cursor: isLoading ? "wait" : "pointer",
                    }}
                  >
                    {isLoading ? "Removing..." : "Confirm Remove"}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setSoftDeleteId(null)}
                    className="uppercase transition-colors"
                    style={{
                      fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                      color: "#4A3F2A", background: "none", border: "none", cursor: "pointer", padding: "3px 8px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Permanent delete confirmation */}
            {showPurge && (
              <div className="mb-2">
                <PermanentDeleteConfirm
                  clientId={client.id}
                  clientName={client.name}
                  clientEmail={client.email}
                  onClose={() => setPurgeId(null)}
                  onSuccess={() => handlePurgeSuccess(client.id)}
                />
              </div>
            )}

            {/* Action buttons (hidden during confirmation flows) */}
            {!showSoftConfirm && !showPurge && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleReactivate(client.id)}
                  className="rounded border uppercase transition-colors disabled:opacity-50"
                  style={{
                    fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                    color: "#1D9E75", borderColor: "#0D3A25", background: "transparent",
                    padding: "3px 8px", cursor: isLoading ? "wait" : "pointer",
                  }}
                >
                  {isLoading ? "..." : "Re-Activate"}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSoftDeleteId(client.id)}
                  className="rounded border uppercase transition-colors disabled:opacity-50"
                  style={{
                    fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                    color: "#B8933A", borderColor: "#2A2010", background: "transparent",
                    padding: "3px 8px", cursor: "pointer",
                  }}
                >
                  Remove
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setPurgeId(client.id)}
                  className="rounded border uppercase transition-colors disabled:opacity-50"
                  style={{
                    fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                    color: "#7A1E1E", borderColor: "#2A1010", background: "transparent",
                    padding: "3px 8px", cursor: "pointer",
                  }}
                >
                  Permanent Delete
                </button>
                <Link
                  href={`/coach/clients/${client.id}`}
                  className="rounded border uppercase no-underline transition-colors hover:text-[#B8933A]"
                  style={{
                    fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
                    color: "#F4EEE4", borderColor: "#1A1A1A", padding: "3px 8px",
                  }}
                >
                  View &rarr;
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
