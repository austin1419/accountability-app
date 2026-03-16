"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { upsertAlertState, upsertAlertIntervention } from "@/lib/coach/alerts/alertStateQueries";
import type { InterventionData } from "@/lib/coach/alerts/alertStateQueries";
import type { AlertStatus } from "@/lib/coach/alerts/types";
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

// ── Actions ──────────────────────────────────────────────────────

export async function updateAlertStatus(
  clientId: string,
  alertType: string,
  status: AlertStatus,
): Promise<{ error?: string }> {
  const auth = await getCoachId();
  if ("error" in auth) return { error: auth.error };

  const result = await upsertAlertState(
    auth.coachId,
    clientId,
    alertType,
    status,
  );

  if (!result.error) {
    revalidatePath("/coach/alerts");
  }

  return result;
}

export async function updateAlertIntervention(
  clientId: string,
  alertType: string,
  intervention: InterventionData,
): Promise<{ error?: string }> {
  const auth = await getCoachId();
  if ("error" in auth) return { error: auth.error };

  const result = await upsertAlertIntervention(
    auth.coachId,
    clientId,
    alertType,
    intervention,
  );

  if (!result.error) {
    revalidatePath("/coach/alerts");
  }

  return result;
}
