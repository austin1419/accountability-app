// ─────────────────────────────────────────────
// COACH NOTES — Coaching Notebook
//
// Server Component. Fetches notes + client list
// before render. Quick Add form is a client component.
// ─────────────────────────────────────────────

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoachNotes, getActiveClients } from "@/lib/coach/notes/getCoachNotes";
import { NOTE_TYPE_LABELS } from "@/lib/coach/notes/types";
import type { NoteType } from "@/lib/coach/notes/types";
import { QuickAddNote } from "./QuickAddNote";

export const dynamic = "force-dynamic";

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

// ── Resolve coach ID ─────────────────────────────────────────────

async function resolveCoachId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/coach/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "coach")
    .maybeSingle();

  if (!data) redirect("/login");
  return data.id;
}

// ── Display helpers ──────────────────────────────────────────────

const typeColors: Record<NoteType, { text: string; border: string; bg: string }> = {
  observation:  { text: "#B8933A", border: "#2A2010", bg: "rgba(184,147,58,0.08)" },
  conversation: { text: "#1D9E75", border: "#0D3A25", bg: "rgba(29,158,117,0.08)" },
  strategy:     { text: "#807868", border: "#1A1A1A", bg: "#111111" },
  reminder:     { text: "#7A1E1E", border: "#2A1010", bg: "rgba(122,30,30,0.10)" },
};

// ── Page ─────────────────────────────────────────────────────────

export default async function CoachNotesPage() {
  const coachId = await resolveCoachId();
  const [notes, clients] = await Promise.all([
    getCoachNotes(coachId),
    getActiveClients(),
  ]);

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="-mx-6 -mt-8 lg:-mx-8">

      {/* ── Date subheader ─────────────────────────── */}
      <div
        className="border-b border-[#1A1A1A]"
        style={{ background: "#0A0A0A", padding: "6px 18px" }}
      >
        <p style={{ fontFamily: ebGaramond, fontSize: "11px", fontStyle: "italic", color: "#4A3F2A" }}>
          {todayDate} — {notes.length} note{notes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Page content ──────────────────────────── */}
      <div style={{ padding: "18px" }}>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] items-start gap-[14px]">

          {/* ── Left: Recent Notes ────────────────── */}
          <div
            className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
            style={{ padding: "16px 20px" }}
          >
            <p
              className="text-[#807868] uppercase mb-4"
              style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em" }}
            >
              Recent Notes
            </p>

            {notes.length === 0 ? (
              <div className="py-10 text-center">
                <p style={{ fontFamily: ebGaramond, fontSize: "12px", fontStyle: "italic", color: "#4A3F2A" }}>
                  No notes yet. Use the form to create your first coaching note.
                </p>
              </div>
            ) : (
              <div className="relative pl-4 border-l border-[#1A1A1A]">
                {notes.map((note) => {
                  const tc = typeColors[note.noteType] ?? typeColors.observation;
                  const dateLabel = new Date(note.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeLabel = new Date(note.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  return (
                    <div key={note.id} className="relative pb-5 last:pb-0">
                      {/* Timeline dot */}
                      <div
                        className="absolute rounded-full"
                        style={{ width: "6px", height: "6px", background: tc.text, left: "-19px", top: "6px" }}
                      />

                      {/* Header: date + type badge + client */}
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.06em", color: "#807868" }}>
                          {dateLabel} {timeLabel}
                        </span>
                        <span
                          className="rounded border uppercase"
                          style={{
                            fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em",
                            color: tc.text, borderColor: tc.border, background: tc.bg,
                            padding: "1px 5px",
                          }}
                        >
                          {NOTE_TYPE_LABELS[note.noteType]}
                        </span>
                        {note.clientName && (
                          <a
                            href={`/coach/clients/${note.clientId}`}
                            className="no-underline hover:underline"
                            style={{ fontFamily: ebGaramond, fontSize: "11px", fontWeight: 600, color: "#DDD5C0" }}
                          >
                            {note.clientName}
                          </a>
                        )}
                        {!note.clientId && (
                          <span style={{ fontFamily: ebGaramond, fontSize: "10px", fontStyle: "italic", color: "#4A3F2A" }}>
                            Global
                          </span>
                        )}
                      </div>

                      {/* Note text */}
                      <p
                        style={{ fontFamily: ebGaramond, fontSize: "12px", color: "#DDD5C0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                      >
                        {note.noteText}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: Quick Add Note ─────────────── */}
          <div
            className="bg-[#0D0D0D] rounded-[7px] border border-[#1A1A1A]"
            style={{ padding: "16px 20px" }}
          >
            <p
              className="text-[#807868] uppercase mb-4"
              style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em" }}
            >
              Quick Add Note
            </p>

            <QuickAddNote clients={clients} />
          </div>

        </div>
      </div>
    </div>
  );
}
