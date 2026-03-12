"use server";

// ─────────────────────────────────────────────
// Coach Server Actions
//
// Runs on the server — safe to use the admin (service role) client here.
// Called directly from AddClientModal (client component).
// ─────────────────────────────────────────────

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";

export async function createClientWithInvite(data: {
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string | null;
  goalName:       string;
  goalDate:       string;
  goalCategory:   string;
  // Weight
  startingWeight:           number | null;
  goalWeight:               number | null;
  // Body composition
  startingBodyFat:          number | null;
  goalBodyFat:              number | null;
  startingSmm:              number | null;
  goalSmm:                  number | null;
  // Performance
  performanceMetricName:    string | null;
  performanceUnit:          string | null;
  performanceDirection:     string | null;
  startingPerformanceValue: number | null;
  goalPerformanceValue:     number | null;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // ── 1. Create public.users row ────────────────────────────────
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      name:         `${data.firstName} ${data.lastName}`,
      email:        data.email.toLowerCase(),
      phone_number: data.phone,
      role:         "client",
    })
    .select("id")
    .single();

  if (userError) {
    if (userError.code === "23505") {
      return { error: "A client with that email already exists." };
    }
    console.error("[createClientWithInvite] users insert failed:", userError.message);
    return { error: "Failed to create client. Please try again." };
  }

  // ── 2. Create the client's first goal ─────────────────────────
  // Select the id back so we can seed the starting progress log entry below.
  const { data: newGoal, error: goalError } = await supabase
    .from("goals")
    .insert({
      user_id:       newUser.id,
      goal_name:     data.goalName,
      goal_date:     data.goalDate,
      goal_category: data.goalCategory,
      // Weight
      start_weight:   data.startingWeight,
      goal_weight:    data.goalWeight,
      current_weight: data.startingWeight,
      // Body composition
      starting_body_fat: data.startingBodyFat,
      goal_body_fat:     data.goalBodyFat,
      starting_smm:      data.startingSmm,
      goal_smm:          data.goalSmm,
      current_body_fat:  data.startingBodyFat,
      current_smm:       data.startingSmm,
      // Performance
      performance_metric_name:    data.performanceMetricName,
      performance_unit:           data.performanceUnit,
      performance_direction:      data.performanceDirection,
      starting_performance_value: data.startingPerformanceValue,
      goal_performance_value:     data.goalPerformanceValue,
      current_performance_value:  data.startingPerformanceValue,
    })
    .select("id")
    .single();

  if (goalError || !newGoal) {
    // Roll back the user row so there's no orphan record
    await supabase.from("users").delete().eq("id", newUser.id);
    console.error("[createClientWithInvite] goals insert failed:", goalError?.message);
    return { error: "Failed to save goal. Please try again." };
  }

  // ── 2b. Seed the starting log entry ───────────────────────────
  // This anchors the chart's leftmost point and ensures the graph
  // renders as soon as the client logs their first value.
  // All seed failures are non-fatal — goal creation is not rolled back.
  const seedDate = new Date().toISOString().split("T")[0];

  if (data.goalCategory === "weight" && data.startingWeight != null) {
    const { error: seedError } = await supabase.from("weight_logs").upsert(
      { user_id: newUser.id, weight: data.startingWeight, logged_at: seedDate },
      { onConflict: "user_id,logged_at" },
    );
    if (seedError) console.error("[createClientWithInvite] failed to seed weight log:", seedError.message);
  }

  if (
    data.goalCategory === "body_composition" &&
    (data.startingBodyFat != null || data.startingSmm != null)
  ) {
    const { error: seedError } = await supabase.from("progress_logs").insert({
      user_id:   newUser.id,
      goal_id:   newGoal.id,
      logged_at: seedDate,
      body_fat:  data.startingBodyFat ?? null,
      smm:       data.startingSmm     ?? null,
    });
    if (seedError) console.error("[createClientWithInvite] failed to seed body comp progress log:", seedError.message);
  }

  if (data.goalCategory === "performance" && data.startingPerformanceValue != null) {
    const { error: seedError } = await supabase.from("progress_logs").insert({
      user_id:           newUser.id,
      goal_id:           newGoal.id,
      logged_at:         seedDate,
      performance_value: data.startingPerformanceValue,
    });
    if (seedError) console.error("[createClientWithInvite] failed to seed performance progress log:", seedError.message);
  }

  // ── 3. Derive the site URL for the invite redirect ────────────
  // NEXT_PUBLIC_SITE_URL must be set to the public-facing URL (e.g. Vercel).
  // Falling back to the request host only works when the coach and client
  // are on the same machine (local dev) — real clients can't reach localhost.
  const headersList = await headers();
  const host        = headersList.get("host") ?? "localhost:3000";
  const protocol    = host.includes("localhost") ? "http" : "https";
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;

  // ── 4. Send the Supabase invite email ─────────────────────────
  // This creates the auth.users row and sends the "Accept Invite" email.
  // The on_auth_user_created trigger auto-links auth_id on the
  // public.users row we just created (matches by email).
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    data.email,
    { redirectTo: `${siteUrl}/auth/confirm` },
  );

  if (inviteError) {
    // DB records exist but no auth account was created.
    // The coach can retry by inviting the client manually from the Supabase dashboard.
    console.error("[createClientWithInvite] invite failed:", inviteError.message);
    return {
      error:
        "Client record created, but the invite email failed to send. " +
        "You can send the invite manually from the Supabase dashboard.",
    };
  }

  // ── 5. Set app_metadata.role so middleware routes them correctly ──
  if (inviteData.user) {
    await supabase.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: { role: "client" },
    });
  }

  return {};
}
