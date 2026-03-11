"use client";

// ─────────────────────────────────────────────
// ClientNotes
//
// Coach-only notes section on the client detail page.
// Loaded with server-fetched notes; new notes are added
// optimistically after the server action confirms.
// ─────────────────────────────────────────────

import { useState } from "react";
import { addClientNote } from "./actions";

type Note = { id: string; note: string; created_at: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
    hour:  "numeric",
    minute: "2-digit",
  });
}

export function ClientNotes({
  clientId,
  initialNotes,
}: {
  clientId:     string;
  initialNotes: Note[];
}) {
  const [notes,   setNotes]   = useState<Note[]>(initialNotes);
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const result = await addClientNote(clientId, trimmed);

    if (result.error) {
      setError(result.error);
    } else {
      const newNote: Note = {
        id:         result.id!,
        note:       trimmed,
        created_at: result.created_at!,
      };
      setNotes((prev) => [newNote, ...prev]);
      setText("");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note about this client…"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {loading ? "Saving…" : "Save Note"}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-gray-400">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {notes.map((n) => (
            <li key={n.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.note}</p>
              <p className="text-xs text-gray-400">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
