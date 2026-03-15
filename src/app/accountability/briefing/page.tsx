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
import { fetchRelevantMemories, detectAndStoreMemories } from "@/lib/ai/aiMemory";
import { buildKnowledgeContext } from "@/lib/ai/knowledgeRetrieval";
import { determineCoachingFocus } from "@/lib/ai/determineCoachingFocus";
import { buildScenarioSignals } from "@/lib/coaching/buildSignals";
import { buildCoachResponse }   from "@/lib/coaching/buildCoachResponse";
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
  const [ctx, memories] = await Promise.all([
    buildClientContext(profile.id, selectedDate),
    fetchRelevantMemories(profile.id),
  ]);
  const readiness      = getFeatureReadiness(ctx, "dailyBriefing");
  const analysis       = analyzeClientContext(ctx);
  const clientSummary  = buildClientSummary(ctx, analysis);
  const coachSummary   = buildCoachSummary(ctx, analysis);
  const knowledge      = await buildKnowledgeContext(ctx, analysis, coachSummary);
  const focus          = determineCoachingFocus(ctx, analysis, memories, knowledge);
  const signals        = buildScenarioSignals(ctx);
  const coachResponse  = buildCoachResponse(signals);
  const briefing       = buildDailyBriefing(ctx, analysis, clientSummary, coachSummary, readiness, memories, knowledge, focus, coachResponse);

  // Store noteworthy memories from this session (fire-and-forget)
  if (readiness.available) {
    detectAndStoreMemories(ctx, analysis).catch((err) =>
      console.error("[DailyBriefing] memory write failed:", err),
    );
  }

  // ── Render ──────────────────────────────────
  return <BriefingShell briefing={briefing} readiness={readiness} />;
}
