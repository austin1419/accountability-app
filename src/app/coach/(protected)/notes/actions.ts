"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { NoteType } from "@/lib/coach/notes/types";
import { revalidatePath } from "next/cache";

// ── Auth helper ──────────────────────────────────────────────────

async function getCoachId(): Promise<{ coachId: string } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "coach")
    .maybeSingle();

  if (!data) return { error: "Unauthorized." };
  return { coachId: data.id };
}

// ── Untyped helper (coach_notes not in generated types) ──────────

type UntypedInsert = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

// ── Actions ──────────────────────────────────────────────────────

export async function createCoachNote(
  noteText: string,
  noteType: NoteType,
  clientId: string | null,
): Promise<{ id?: string; error?: string }> {
  if (!noteText.trim()) return { error: "Note text is required." };

  const auth = await getCoachId();
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();

  const row: Record<string, unknown> = {
    coach_id: auth.coachId,
    note_text: noteText.trim(),
    note_type: noteType,
  };
  if (clientId) {
    row.client_id = clientId;
  }

  const { data, error } = await (admin as unknown as UntypedInsert)
    .from("coach_notes")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[createCoachNote] insert failed:", error);
    return { error: String((error as { message?: string }).message ?? error) };
  }

  revalidatePath("/coach/notes");
  return { id: (data as { id: string }).id };
}
