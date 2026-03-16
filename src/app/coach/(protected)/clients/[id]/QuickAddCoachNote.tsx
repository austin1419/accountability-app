"use client";

// ─────────────────────────────────────────────
// QuickAddCoachNote — inline note form for client profile
//
// Reuses the existing createCoachNote server action.
// Client ID is pre-filled and not changeable.
// ─────────────────────────────────────────────

import { useState, useTransition } from "react";
import { createCoachNote } from "@/app/coach/(protected)/notes/actions";
import type { NoteType } from "@/lib/coach/notes/types";
import { NOTE_TYPE_LABELS } from "@/lib/coach/notes/types";

interface QuickAddCoachNoteProps {
  clientId: string;
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

const noteTypes: NoteType[] = ["observation", "conversation", "strategy", "reminder"];

export function QuickAddCoachNote({ clientId }: QuickAddCoachNoteProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("observation");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleSubmit() {
    if (!noteText.trim()) return;

    startTransition(async () => {
      const result = await createCoachNote(noteText, noteType, clientId);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
      } else {
        setFeedback({ type: "success", message: "Note saved." });
        setNoteText("");
        setNoteType("observation");
        setTimeout(() => {
          setFeedback(null);
          setOpen(false);
        }, 1500);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="uppercase transition-colors hover:text-[#B8933A]"
        style={{
          fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
          color: "#4A3F2A", background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        + Add Note
      </button>
    );
  }

  return (
    <div
      className="rounded-[5px] border border-[#1A1A1A] mt-2"
      style={{ background: "#111111", padding: "10px 12px" }}
    >
      {/* Type selector */}
      <div className="flex items-center gap-2 mb-2">
        {noteTypes.map((t) => (
          <button
            key={t}
            type="button"
            disabled={isPending}
            onClick={() => setNoteType(t)}
            className="rounded border uppercase transition-colors disabled:opacity-50"
            style={{
              fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em",
              color: noteType === t ? "#B8933A" : "#4A3F2A",
              borderColor: noteType === t ? "#2A2010" : "#1A1A1A",
              background: noteType === t ? "rgba(184,147,58,0.08)" : "transparent",
              padding: "2px 6px", cursor: isPending ? "wait" : "pointer",
            }}
          >
            {NOTE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={noteText}
        disabled={isPending}
        onChange={(e) => setNoteText(e.target.value)}
        rows={3}
        placeholder="Quick coaching note..."
        className="w-full rounded border border-[#1A1A1A] mb-2 resize-none disabled:opacity-50"
        style={{
          fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0",
          background: "#0D0D0D", padding: "7px 9px", outline: "none", lineHeight: 1.5,
        }}
      />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !noteText.trim()}
          onClick={handleSubmit}
          className="rounded-[4px] uppercase transition-colors disabled:opacity-50"
          style={{
            fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
            color: "#F4EEE4", background: "#B8933A", padding: "5px 12px",
            cursor: isPending ? "wait" : "pointer", border: "none",
          }}
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => { setOpen(false); setNoteText(""); setFeedback(null); }}
          className="uppercase transition-colors"
          style={{
            fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
            color: "#4A3F2A", background: "none", border: "none", cursor: "pointer", padding: "5px 8px",
          }}
        >
          Cancel
        </button>
        {feedback && (
          <span style={{
            fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic",
            color: feedback.type === "success" ? "#1D9E75" : "#7A1E1E",
          }}>
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  );
}
