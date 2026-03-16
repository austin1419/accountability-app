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
          className="w-full border border-[#252525] rounded bg-[#1A1A1A] px-3 py-2 text-sm text-[#DDD5C0] placeholder:text-[#807868] resize-none focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]"
        />
        {error && <p className="text-xs text-[#7A1E1E]">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="bg-[#B8933A] hover:bg-[#C9A44A] disabled:opacity-50 text-[#0D0D0D] text-xs font-semibold px-4 py-2 rounded transition-colors uppercase tracking-widest"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {loading ? "Saving…" : "Save Note"}
          </button>
        </div>
      </form>

      {/* Notes timeline */}
      {notes.length === 0 ? (
        <p className="text-[#807868]" style={{ fontFamily: "'EB Garamond', serif", fontSize: "12px", fontStyle: "italic" }}>
          No notes yet.
        </p>
      ) : (
        <div className="relative pl-4 border-l border-[#1A1A1A]">
          {notes.map((n) => (
            <div key={n.id} className="relative pb-4 last:pb-0">
              {/* Timeline dot */}
              <div
                className="absolute bg-[#B8933A] rounded-full"
                style={{ width: "6px", height: "6px", left: "-19px", top: "6px" }}
              />
              <p
                className="text-[#807868] mb-1"
                style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.06em" }}
              >
                {formatDate(n.created_at)}
              </p>
              <p className="text-sm text-[#DDD5C0] whitespace-pre-wrap leading-relaxed">{n.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
