"use client";

// ─────────────────────────────────────────────
// ArchiveClientButton
//
// Confirmation modal for archiving a client.
// On confirm, sets is_active = false in Supabase
// and redirects back to the clients list.
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveClient } from "./actions";

export function ArchiveClientButton({
  clientId,
  clientName,
}: {
  clientId:   string;
  clientName: string;
}) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setReason("");
    setError(null);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await archiveClient(clientId, reason.trim() || undefined);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/coach/clients");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-400 hover:text-red-500 transition-colors"
      >
        Archive client
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-semibold text-gray-900">Archive client?</h3>
              <p className="text-sm text-gray-500 mt-1">
                <strong>{clientName}</strong> will be removed from your active client list.
                Their data is preserved and they can be reactivated later.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Reason <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Completed program, taking a break…"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
              >
                {loading ? "Archiving…" : "Yes, Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
