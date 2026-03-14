// ─────────────────────────────────────────────
// POST /api/pulse/chat
//
// PulseAI chat endpoint. Accepts a user message,
// runs the existing AI pipeline to build context,
// generates a coaching response, stores the
// conversation, and returns the response.
//
// Feature flags:
//   PULSE_AI_ENABLED        — global kill switch
//   users.ai_access_enabled — per-user entitlement
//   PULSE_AI_DEV_ALL_USERS  — local dev override (bypasses per-user check)
//
// Reuses the exact same deterministic pipeline
// used by the Daily Briefing. No new analysis logic.
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }          from "@/lib/supabase-admin";
import { buildClientContext }          from "@/lib/ai/buildClientContext";
import { analyzeClientContext }        from "@/lib/ai/analyzeClientContext";
import { buildCoachSummary }           from "@/lib/ai/buildCoachSummary";
import { buildKnowledgeContext }       from "@/lib/ai/knowledgeRetrieval";
import { determineCoachingFocus }      from "@/lib/ai/determineCoachingFocus";
import { fetchRelevantMemories }       from "@/lib/ai/aiMemory";
import { buildChatSystemPrompt }       from "@/lib/ai/buildChatSystemPrompt";
import { generateRuleBasedCoachResponse } from "@/lib/coach/generateRuleBasedCoachResponse";
import { readFile }                    from "fs/promises";
import { join }                        from "path";

// ── Feature flags ──────────────────────────────
// Global kill switch — if false, ALL users get rule-based responses
const PULSE_AI_ENABLED = process.env.PULSE_AI_ENABLED === "true";

// LOCAL DEV ONLY — bypasses per-user ai_access_enabled check.
// Set PULSE_AI_DEV_ALL_USERS=true in .env.local to grant AI to everyone locally.
// Do NOT set this in production environments.
const DEV_ALL_USERS = process.env.PULSE_AI_DEV_ALL_USERS === "true";

// ── Core identity loader (cached) ──────────────
let cachedIdentity: string | null = null;
async function loadCoreIdentity(): Promise<string> {
  if (cachedIdentity) return cachedIdentity;
  cachedIdentity = await readFile(
    join(process.cwd(), "knowledge", "core_identity.md"),
    "utf-8",
  );
  return cachedIdentity;
}

// ── Conversation history loader ────────────────
async function loadConversationHistory(
  userId: string,
  conversationId: string,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("role, content")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(10);

  return (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content,
  }));
}

// ── Store message ──────────────────────────────
type ResponseMode = "rule_based" | "llm" | "fallback_rule_based";

async function storeMessage(
  userId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  responseMode: ResponseMode = "rule_based",
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id:         userId,
      conversation_id: conversationId,
      role,
      content,
      response_mode:   responseMode,
    });
  if (error) console.error("[pulse/chat] store failed:", error);
}

// ── LLM response generation ───────────────────
async function generateLLMResponse(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
): Promise<string> {
  // Dynamic import — only loads the Anthropic SDK when LLM is enabled
  const { getAnthropicClient } = await import("@/lib/anthropic");
  const anthropic = getAnthropicClient();

  const messages = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

// ── POST handler ───────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, ai_access_enabled")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  // ── Parse body ────────────────────────────────
  let body: { message?: string; selectedDate?: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message        = body.message?.trim();
  const selectedDate   = body.selectedDate;
  const conversationId = body.conversationId;

  if (!message || !selectedDate || !conversationId) {
    return NextResponse.json(
      { error: "message, selectedDate, and conversationId are required" },
      { status: 400 },
    );
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
  }

  // ── Run existing pipeline ─────────────────────
  const [ctx, memories, coreIdentity] = await Promise.all([
    buildClientContext(profile.id, selectedDate),
    fetchRelevantMemories(profile.id),
    loadCoreIdentity(),
  ]);

  const analysis     = analyzeClientContext(ctx);
  const coachSummary = buildCoachSummary(ctx, analysis);
  const knowledge    = await buildKnowledgeContext(ctx, analysis, coachSummary);
  const focus        = determineCoachingFocus(ctx, analysis, memories, knowledge);

  // ── Determine response mode ──────────────────
  // LLM only when: global switch ON + (user has AI access OR dev override)
  const userHasAI = PULSE_AI_ENABLED
    && (profile.ai_access_enabled === true || DEV_ALL_USERS);

  console.log("[pulse/chat] incoming message:", JSON.stringify(message));
  console.log("[pulse/chat] userHasAI:", userHasAI,
    "| PULSE_AI_ENABLED:", PULSE_AI_ENABLED,
    "| DEV_ALL_USERS:", DEV_ALL_USERS,
    "| ai_access_enabled:", profile.ai_access_enabled);

  // ── Load conversation history BEFORE storing ──
  // (prevents the new user message from appearing
  //  in history AND being appended again by generateLLMResponse)
  const history = userHasAI
    ? await loadConversationHistory(profile.id, conversationId)
    : [];

  // ── Store user message ────────────────────────
  await storeMessage(profile.id, conversationId, "user", message);

  // ── Generate response ─────────────────────────
  let assistantContent: string;
  let responseMode: ResponseMode = "rule_based";

  if (userHasAI) {
    // ── LLM mode: build prompt + call Claude ────
    try {
      console.log("[pulse/chat] calling Claude API...");
      const systemPrompt = buildChatSystemPrompt({
        ctx,
        analysis,
        coachSummary,
        focus,
        knowledge,
        memories,
        coreIdentity,
      });

      assistantContent = await generateLLMResponse(systemPrompt, history, message);
      responseMode = "llm";
      console.log("[pulse/chat] LLM response received, length:", assistantContent.length);
    } catch (err) {
      // ── Fallback: LLM failed → rule-based ──────
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[pulse/chat] LLM FAILED:", errMsg);
      console.error("[pulse/chat] falling back to rule-based");
      assistantContent = generateRuleBasedCoachResponse({
        ctx,
        analysis,
        focus,
        knowledge,
        userMessage: message,
      });
      responseMode = "fallback_rule_based";
    }
  } else {
    console.log("[pulse/chat] using rule-based mode (AI not enabled for user)");
    // ── Rule-based mode: deterministic response ──
    assistantContent = generateRuleBasedCoachResponse({
      ctx,
      analysis,
      focus,
      knowledge,
      userMessage: message,
    });
    responseMode = "rule_based";
  }

  console.log("[pulse/chat] responseMode:", responseMode);

  // ── Store assistant response ──────────────────
  await storeMessage(profile.id, conversationId, "assistant", assistantContent, responseMode);

  return NextResponse.json({
    response: assistantContent,
    conversationId,
    mode: responseMode,
  });
}
