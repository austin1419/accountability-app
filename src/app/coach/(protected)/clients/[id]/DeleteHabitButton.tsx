"use client";

// ─────────────────────────────────────────────
// DeleteHabitButton
//
// Inline delete action for each habit row on the coach client detail page.
// Shows a trash icon; on click, expands into an inline confirm/cancel prompt.
// On confirm, calls onConfirm() — HabitsTabs owns the removal logic.
// ─────────────────────────────────────────────

import { useState } from "react";

export function DeleteHabitButton({
  taskName,
  onConfirm,
}: {
  taskName:  string;
  onConfirm: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading,    setLoading]    = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-500">Remove &ldquo;{taskName}&rdquo;?</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {loading ? "Removing…" : "Remove"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors"
      aria-label={`Remove habit: ${taskName}`}
    >
      {/* Trash icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
