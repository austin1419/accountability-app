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

export async function updateClientGoalMetrics(
  goalId: string,
  patch: {
    // Weight
    current_weight?:             number | null;
    goal_weight?:                number | null;
    // Body composition
    current_body_fat?:           number | null;
    goal_body_fat?:              number | null;
    current_smm?:                number | null;
    goal_smm?:                   number | null;
    // Performance
    current_performance_value?:  number | null;
    goal_performance_value?:     number | null;
  }
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("goals").update(patch).eq("id", goalId);
  if (error) {
    console.error("[updateClientGoalMetrics] failed:", error.message);
    return { error: "Failed to update metrics. Please try again." };
  }
  return {};
}

export async function addClientHabit(
  goalId:   string,
  taskName: string,
  category: string,
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tasks")
    .insert({ goal_id: goalId, task_name: taskName, category });

  if (error) {
    console.error("[addClientHabit] insert failed:", error.message);
    return { error: "Failed to save habit. Please try again." };
  }

  return {};
}

export async function reactivateClient(
  clientId: string,
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ is_active: true, archive_reason: null })
    .eq("id", clientId);

  if (error) {
    console.error("[reactivateClient] failed:", error.message);
    return { error: "Failed to reactivate client. Please try again." };
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
