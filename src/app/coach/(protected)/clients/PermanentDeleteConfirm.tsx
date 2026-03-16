"use client";

// ─────────────────────────────────────────────
// PermanentDeleteConfirm — email-confirmed purge flow
//
// Requires typing the client's email to confirm.
// Calls purgeClient server action for full erasure.
// ─────────────────────────────────────────────

import { useState, useTransition } from "react";
import { purgeClient } from "./[id]/actions";

interface PermanentDeleteConfirmProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

export function PermanentDeleteConfirm({
  clientId,
  clientName,
  clientEmail,
  onClose,
  onSuccess,
}: PermanentDeleteConfirmProps) {
  const [isPending, startTransition] = useTransition();
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailMatches = emailInput.trim().toLowerCase() === clientEmail.toLowerCase();

  function handlePurge() {
    if (!emailMatches) return;

    startTransition(async () => {
      setError(null);
      const result = await purgeClient(clientId, clientEmail);
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Warning banner */}
      <div
        className="rounded-[5px] border border-[#7A1E1E]"
        style={{ background: "rgba(122,30,30,0.10)", padding: "10px 12px" }}
      >
        <p
          className="uppercase mb-1"
          style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#7A1E1E" }}
        >
          Permanent Deletion
        </p>
        <p style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0", lineHeight: 1.5 }}>
          This will permanently erase <strong>{clientName}</strong> and all their data from the system — goals, tasks, logs, journals, notes, alerts, and their auth account. This cannot be undone.
        </p>
      </div>

      {/* Email confirmation */}
      <div>
        <label
          className="uppercase block mb-1.5"
          style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
        >
          Type the client&apos;s email to confirm
        </label>
        <p
          className="mb-1.5"
          style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#807868", fontStyle: "italic" }}
        >
          {clientEmail}
        </p>
        <input
          type="text"
          value={emailInput}
          disabled={isPending}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="Enter email address..."
          className="w-full rounded border border-[#1A1A1A] disabled:opacity-50"
          style={{
            fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
            background: "#111111", padding: "7px 10px", outline: "none",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontFamily: ebGaramond, fontSize: "11px", color: "#7A1E1E" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !emailMatches}
          onClick={handlePurge}
          className="rounded-[5px] uppercase transition-colors disabled:opacity-40"
          style={{
            fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em",
            color: "#F4EEE4",
            background: emailMatches ? "#7A1E1E" : "#2A1010",
            padding: "7px 14px",
            cursor: isPending ? "wait" : emailMatches ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          {isPending ? "Purging..." : "Permanently Delete"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          className="uppercase transition-colors"
          style={{
            fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em",
            color: "#4A3F2A", background: "none", border: "none",
            cursor: "pointer", padding: "7px 10px",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
