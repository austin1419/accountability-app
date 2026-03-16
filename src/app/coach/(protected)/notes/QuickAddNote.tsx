"use client";

// ─────────────────────────────────────────────
// QuickAddNote — client component for note creation
// ─────────────────────────────────────────────

import { useState, useTransition } from "react";
import { createCoachNote } from "./actions";
import type { NoteType } from "@/lib/coach/notes/types";
import { NOTE_TYPE_LABELS } from "@/lib/coach/notes/types";

interface QuickAddNoteProps {
  clients: { id: string; name: string }[];
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

const noteTypes: NoteType[] = ["observation", "conversation", "strategy", "reminder"];

export function QuickAddNote({ clients }: QuickAddNoteProps) {
  const [isPending, startTransition] = useTransition();
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("observation");
  const [clientId, setClientId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleSubmit() {
    if (!noteText.trim()) return;

    startTransition(async () => {
      const result = await createCoachNote(noteText, noteType, clientId || null);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
      } else {
        setFeedback({ type: "success", message: "Note saved." });
        setNoteText("");
        setClientId("");
        setNoteType("observation");
        setTimeout(() => setFeedback(null), 2000);
      }
    });
  }

  return (
    <div>
      {/* Note type */}
      <label
        className="uppercase block mb-1.5"
        style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
      >
        Type
      </label>
      <select
        value={noteType}
        disabled={isPending}
        onChange={(e) => setNoteType(e.target.value as NoteType)}
        className="w-full rounded border border-[#1A1A1A] mb-3 disabled:opacity-50"
        style={{
          fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
          background: "#111111", padding: "7px 10px", outline: "none",
        }}
      >
        {noteTypes.map((t) => (
          <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>
        ))}
      </select>

      {/* Client (optional) */}
      <label
        className="uppercase block mb-1.5"
        style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
      >
        Client (optional)
      </label>
      <select
        value={clientId}
        disabled={isPending}
        onChange={(e) => setClientId(e.target.value)}
        className="w-full rounded border border-[#1A1A1A] mb-3 disabled:opacity-50"
        style={{
          fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
          background: "#111111", padding: "7px 10px", outline: "none",
        }}
      >
        <option value="">Global note (no client)</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Note text */}
      <label
        className="uppercase block mb-1.5"
        style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
      >
        Note
      </label>
      <textarea
        value={noteText}
        disabled={isPending}
        onChange={(e) => setNoteText(e.target.value)}
        rows={5}
        placeholder="Write your coaching note..."
        className="w-full rounded border border-[#1A1A1A] mb-3 resize-none disabled:opacity-50"
        style={{
          fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
          background: "#111111", padding: "8px 10px", outline: "none",
          lineHeight: 1.6,
        }}
      />

      {/* Submit */}
      <button
        type="button"
        disabled={isPending || !noteText.trim()}
        onClick={handleSubmit}
        className="w-full rounded-[5px] uppercase transition-colors disabled:opacity-50"
        style={{
          fontFamily: cinzel, fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
          color: "#F4EEE4", background: "#B8933A", padding: "9px 14px",
          cursor: isPending ? "wait" : "pointer", border: "none",
        }}
      >
        {isPending ? "Saving..." : "Save Note"}
      </button>

      {/* Feedback */}
      {feedback && (
        <p
          className="mt-2 text-center"
          style={{
            fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic",
            color: feedback.type === "success" ? "#1D9E75" : "#7A1E1E",
          }}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
