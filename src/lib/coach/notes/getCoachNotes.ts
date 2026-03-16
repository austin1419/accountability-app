// ─────────────────────────────────────────────
// getCoachNotes — SERVER ONLY
//
// Fetches coach notes with optional client name join.
// Table not in generated types — uses untyped cast.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import type { CoachNote, NoteType } from "./types";

export type { CoachNote, NoteType } from "./types";
export { NOTE_TYPE_LABELS } from "./types";

interface RawNoteRow {
  id: string;
  coach_id: string;
  client_id: string | null;
  note_text: string;
  note_type: string;
  created_at: string;
  updated_at: string;
}

// Untyped helper for coach_notes table (not in generated types)
type UntypedFrom = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  };
};

export async function getCoachNotes(
  coachId: string,
  limit = 50,
): Promise<CoachNote[]> {
  const supabase = createAdminClient();

  // Fetch notes
  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("coach_notes")
    .select("id, coach_id, client_id, note_text, note_type, created_at, updated_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getCoachNotes] query failed:", error);
    return [];
  }

  const rows = (data ?? []) as RawNoteRow[];

  // Resolve client names for notes with client_id
  const clientIds = [...new Set(rows.filter((r) => r.client_id).map((r) => r.client_id!))];
  const clientNameMap = new Map<string, string>();

  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("users")
      .select("id, name")
      .in("id", clientIds);

    for (const c of clients ?? []) {
      clientNameMap.set(c.id, c.name);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    coachId: r.coach_id,
    clientId: r.client_id,
    clientName: r.client_id ? (clientNameMap.get(r.client_id) ?? null) : null,
    noteText: r.note_text,
    noteType: r.note_type as NoteType,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/** Fetch active client list for the note creation form. */
export async function getActiveClients(
): Promise<{ id: string; name: string }[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "client")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}
