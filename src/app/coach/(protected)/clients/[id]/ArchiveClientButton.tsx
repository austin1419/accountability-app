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
        className="text-xs text-[#9A9080] hover:text-[#7A1E1E] border border-[#252525] hover:border-[#7A1E1E] px-3 py-1.5 rounded cursor-pointer transition-all duration-150"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Archive client
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-[#141414] rounded border border-[#252525] w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base text-[#F4EEE4]" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>Archive client?</h3>
              <p className="text-sm text-[#9A9080] mt-1">
                <strong className="text-[#DDD5C0] font-medium">{clientName}</strong> will be removed from your active client list.
                Their data is preserved and they can be reactivated later.
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
                Reason <span className="text-[#807868] font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Completed program, taking a break…"
                rows={3}
                className="w-full border border-[#252525] rounded bg-[#1A1A1A] px-3 py-2 text-sm text-[#DDD5C0] placeholder:text-[#807868] resize-none focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]"
              />
            </div>

            {error && <p className="text-xs text-[#7A1E1E]">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-xs text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-4 py-2 rounded cursor-pointer transition-all duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-[#7A1E1E] hover:bg-[#8C2424] disabled:opacity-60 text-[#F4EEE4] text-xs font-semibold px-5 py-2 rounded border border-[#7A1E1E] hover:border-[#8C2424] cursor-pointer transition-all duration-150 uppercase tracking-widest"
                style={{ fontFamily: "'Cinzel', serif" }}
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
