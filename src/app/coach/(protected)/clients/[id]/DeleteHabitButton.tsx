"use client";

// ─────────────────────────────────────────────
// DeleteHabitButton
//
// Trash icon that opens a confirmation modal with an optional reason field.
// On confirm, calls onConfirm(reason) — HabitsTabs owns the removal logic.
// ─────────────────────────────────────────────

import { useState } from "react";

export function DeleteHabitButton({
  taskName,
  onConfirm,
}: {
  taskName:  string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [open,    setOpen]    = useState(false);
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setOpen(false);
    setReason("");
  }

  async function handleConfirm() {
    setLoading(true);
    await onConfirm(reason.trim());
    setLoading(false);
    handleClose();
  }

  return (
    <>
      {/* Trash icon */}
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 text-[#9A9080] hover:text-[#7A1E1E] cursor-pointer transition-all duration-150"
        aria-label={`Remove habit: ${taskName}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Confirmation modal */}
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
              <h3 className="text-base text-[#F4EEE4]" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>Remove habit?</h3>
              <p className="text-sm text-[#9A9080] mt-1">
                &ldquo;{taskName}&rdquo; will move to Old Habits.
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
                Reason <span className="text-[#807868] font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Client mastered this habit"
                rows={3}
                className="w-full border border-[#252525] rounded bg-[#1A1A1A] px-3 py-2 text-sm text-[#DDD5C0] placeholder:text-[#807868] resize-none focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]"
              />
            </div>

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
                {loading ? "Removing…" : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
