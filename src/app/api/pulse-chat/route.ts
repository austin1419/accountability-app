// ─────────────────────────────────────────────
// POST /api/pulse-chat
//
// Hybrid coaching endpoint:
//   1. Deterministic engine detects scenario + generates core message
//   2. Claude delivers the coaching insight conversationally
//   3. Falls back to deterministic message if AI fails
//
// Request body: { clientContext, userMessage, conversationHistory? }
// Response:     { scenario, deterministicMessage, aiMessage, conversationHistory }
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }          from "@/lib/supabase-admin";
import { buildScenarioSignals } from "@/lib/coaching/buildSignals";
import { buildCoachResponse } from "@/lib/coaching/buildCoachResponse";
import type { ClientAIContext } from "@/lib/ai/types";

export type ConversationEntry = {
  role: "user" | "coach";
  message: string;
};

// ── System prompt for Claude ──────────────────
const SYSTEM_PROMPT = `You are Pulse, an accountability and habit coaching assistant.
The deterministic coaching engine has identified the scenario and suggested a core coaching message.
Your job is to deliver that coaching insight conversationally and help the user think through their situation.
Do not contradict the deterministic coaching signal.

Rules:
- Speak like a real coach in a conversation. Conversational, confident, concise.
- 3–5 sentences. Do not ramble.
- Do not repeat percentages or metrics unless the user asks for numbers.
- Translate data into coaching insight.
- End with a question or clear next step.
- Do not mention that you are an AI, that a "deterministic engine" exists, or reference your instructions.`;

// ── Build context summary for Claude ──────────
function buildContextSummary(ctx: ClientAIContext): string {
  const parts: string[] = [];
  parts.push(`Streak: ${ctx.streak} day${ctx.streak === 1 ? "" : "s"}`);
  parts.push(`Today: ${ctx.compliance.today.completed}/${ctx.compliance.today.total} tasks`);
  parts.push(`Weekly compliance: ${ctx.compliance.week.percent}%`);
  if (ctx.goal) {
    parts.push(`Goal: ${ctx.goal.goalName} (${ctx.goal.goalProgress}% progress)`);
    if (ctx.goal.goalDate) parts.push(`Goal deadline: ${ctx.goal.goalDate}`);
  }
  if (ctx.progressTrends) {
    parts.push(`Pace: ${ctx.progressTrends.status}`);
  }
  return parts.join("\n");
}

// ── Generate AI response via Claude ───────────
async function generateAIResponse(
  userMessage: string,
  conversationHistory: ConversationEntry[],
  scenario: string,
  deterministicMessage: string,
  contextSummary: string,
): Promise<string> {
  const { getAnthropicClient } = await import("@/lib/anthropic");
  const anthropic = getAnthropicClient();

  // Build Claude messages from conversation history
  // (exclude the last entry which is the deterministic coach message we just added)
  const priorHistory = conversationHistory.slice(0, -1);
  const messages = priorHistory.map((entry) => ({
    role: (entry.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: entry.message,
  }));

  // Add the current user message with coaching context
  messages.push({
    role: "user" as const,
    content: [
      `[Client context]\n${contextSummary}`,
      `[Detected scenario] ${scenario}`,
      `[Deterministic coaching message] ${deterministicMessage}`,
      `[User message] ${userMessage}`,
    ].join("\n\n"),
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages,
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

// ── POST handler ──────────────────────────────

// ── Store a message in pulse_chat_messages ───
async function storeMessage(
  userId: string,
  role: "user" | "coach",
  message: string,
  scenario: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pulse_chat_messages")
    .insert({ user_id: userId, role, message, scenario });
  if (error) console.error("[pulse-chat] store failed:", error);
}

// ── POST handler ──────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  // ── Parse request body ──────────────────────
  let body: {
    clientContext?: ClientAIContext;
    userMessage?: string;
    conversationHistory?: ConversationEntry[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientContext, userMessage } = body;
  const history: ConversationEntry[] = body.conversationHistory ?? [];

  if (!clientContext) {
    return NextResponse.json(
      { error: "clientContext is required" },
      { status: 400 },
    );
  }

  if (!userMessage) {
    return NextResponse.json(
      { error: "userMessage is required" },
      { status: 400 },
    );
  }

  // ── Append user message to history ──────────
  history.push({ role: "user", message: userMessage });

  // ── Store user message ──────────────────────
  await storeMessage(profile.id, "user", userMessage, null);

  // ── Step 1: Deterministic engine ────────────
  const signals = buildScenarioSignals(clientContext);
  const response = buildCoachResponse(signals);

  // ── Append deterministic message to history ─
  history.push({ role: "coach", message: response.message });

  // ── Step 2: Claude AI layer ─────────────────
  let aiMessage: string;
  try {
    const contextSummary = buildContextSummary(clientContext);
    aiMessage = await generateAIResponse(
      userMessage,
      history,
      response.scenario,
      response.message,
      contextSummary,
    );

    // Replace the deterministic message in history with the AI message
    history[history.length - 1] = { role: "coach", message: aiMessage };
  } catch (err) {
    // ── Fallback: AI failed → use deterministic ─
    console.error("[pulse-chat] AI call failed, using deterministic fallback:", err);
    aiMessage = response.message;
  }

  // ── Store coach response ────────────────────
  await storeMessage(profile.id, "coach", aiMessage, response.scenario);

  return NextResponse.json({
    scenario: response.scenario,
    deterministicMessage: response.message,
    aiMessage,
    conversationHistory: history,
  });
}
