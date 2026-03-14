// ─────────────────────────────────────────────
// DAILY BRIEFING — full-screen AI briefing view
//
// Server Component that runs the full AI pipeline:
//   buildClientContext → analyzeClientContext →
//   buildClientSummary → buildCoachSummary →
//   buildDailyBriefing → render
//
// No LLM calls. Deterministic only.
// ─────────────────────────────────────────────

import { redirect }              from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }     from "@/lib/supabase-admin";
import { buildClientContext }    from "@/lib/ai/buildClientContext";
import { analyzeClientContext }  from "@/lib/ai/analyzeClientContext";
import { buildClientSummary }    from "@/lib/ai/buildClientSummary";
import { buildCoachSummary }     from "@/lib/ai/buildCoachSummary";
import { buildDailyBriefing }    from "@/lib/ai/buildDailyBriefing";
import { getFeatureReadiness }   from "@/lib/ai/getAIFeatureReadiness";
import { BriefingShell }         from "@/components/briefing/BriefingShell";

export const dynamic = "force-dynamic";

export default async function DailyBriefingPage() {
  // ── Auth ────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // ── Date ────────────────────────────────────
  const selectedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  // ── AI Pipeline ─────────────────────────────
  const ctx           = await buildClientContext(profile.id, selectedDate);
  const readiness     = getFeatureReadiness(ctx, "dailyBriefing");
  const analysis      = analyzeClientContext(ctx);
  const clientSummary = buildClientSummary(ctx, analysis);
  const coachSummary  = buildCoachSummary(ctx, analysis);
  const briefing      = buildDailyBriefing(ctx, analysis, clientSummary, coachSummary, readiness);

  // ── Render ──────────────────────────────────
  return <BriefingShell briefing={briefing} readiness={readiness} />;
}
