"use server";

import { createAdminClient } from "@/lib/supabase-admin";

export async function updateClientWeights(
  goalId: string,
  data: { currentWeight: number | null; goalWeight: number | null },
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("goals")
    .update({
      current_weight: data.currentWeight,
      goal_weight:    data.goalWeight,
    })
    .eq("id", goalId);

  if (error) {
    console.error("[updateClientWeights] failed:", error.message);
    return { error: "Failed to update weights. Please try again." };
  }

  return {};
}

export async function archiveClient(
  clientId: string,
  reason?: string,
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ is_active: false, archive_reason: reason ?? null })
    .eq("id", clientId);

  if (error) {
    console.error("[archiveClient] failed:", error.message);
    return { error: "Failed to archive client. Please try again." };
  }

  return {};
}

export async function addClientNote(
  clientId: string,
  note: string,
): Promise<{ error?: string; id?: string; created_at?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, note })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[addClientNote] failed:", error.message);
    return { error: "Failed to save note. Please try again." };
  }

  return { id: data.id, created_at: data.created_at };
}

export async function removeClientHabit(
  taskId: string,
  reason?: string,
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tasks")
    .update({ is_active: false, removal_reason: reason ?? null })
    .eq("id", taskId);

  if (error) {
    console.error("[removeClientHabit] failed:", error.message);
    return { error: "Failed to remove habit. Please try again." };
  }

  return {};
}
