// ─────────────────────────────────────────────
// aiMemory — coaching engine memory layer
//
// Provides read/write helpers for the ai_memories table.
// Allows the coaching engine to remember patterns,
// milestones, and past insights across sessions.
//
// Server-only. Uses the admin Supabase client.
// ─────────────────────────────────────────────

import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import type {
  AIMemory,
  AIMemoryType,
  ClientAIContext,
  ClientAnalysis,
} from "./types";

// ═══════════════════════════════════════════════
// READ — fetch relevant memories for briefing
// ═══════════════════════════════════════════════

/**
 * Fetch the most relevant memories for a user.
 *
 * Retrieval strategy: importance first, then recency.
 * Touching `last_used_at` on retrieval so frequently
 * used memories stay fresh and unused ones age out.
 *
 * @param userId  The user's internal ID
 * @param limit   Max memories to return (default 5)
 */
export async function fetchRelevantMemories(
  userId: string,
  limit = 5,
): Promise<AIMemory[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_memories")
    .select("id, user_id, memory_type, memory_text, importance_score, created_at, last_used_at")
    .eq("user_id", userId)
    .order("importance_score", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchRelevantMemories] query failed:", error);
    return [];
  }

  const memories: AIMemory[] = (data ?? []).map((row) => ({
    id:              row.id,
    userId:          row.user_id,
    memoryType:      row.memory_type as AIMemoryType,
    memoryText:      row.memory_text,
    importanceScore: row.importance_score,
    createdAt:       row.created_at,
    lastUsedAt:      row.last_used_at,
  }));

  // Touch last_used_at for retrieved memories (fire-and-forget)
  if (memories.length > 0) {
    const ids = memories.map((m) => m.id);
    supabase
      .from("ai_memories")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", ids)
      .then(({ error: updateError }) => {
        if (updateError) console.error("[fetchRelevantMemories] touch failed:", updateError);
      });
  }

  return memories;
}

// ═══════════════════════════════════════════════
// WRITE — create a new memory
// ═══════════════════════════════════════════════

/**
 * Store a new memory for a user.
 * Deduplicates by checking if an identical memory_text
 * already exists — skips silently if so.
 */
export async function createMemory(
  userId: string,
  type: AIMemoryType,
  text: string,
  importance: number = 5,
): Promise<void> {
  const supabase = createAdminClient();

  // Dedup check — don't store the exact same text twice
  const { data: existing } = await supabase
    .from("ai_memories")
    .select("id")
    .eq("user_id", userId)
    .eq("memory_text", text)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase
    .from("ai_memories")
    .insert({
      user_id:          userId,
      memory_type:      type,
      memory_text:      text,
      importance_score: Math.max(1, Math.min(10, importance)),
    });

  if (error) {
    console.error("[createMemory] insert failed:", error);
  }
}

// ═══════════════════════════════════════════════
// DETECT — extract memories from current analysis
// ═══════════════════════════════════════════════
//
// Called after the AI pipeline runs. Inspects the
// context + analysis for meaningful events worth
// remembering. Only writes when something notable
// happens — not every briefing.

/**
 * Detect and store noteworthy memories from this session.
 * Fire-and-forget — does not block the briefing render.
 */
export async function detectAndStoreMemories(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
): Promise<void> {
  const userId = ctx.client.userId;
  const promises: Promise<void>[] = [];

  // ── Streak milestones ─────────────────────────
  const streak = ctx.streak;
  if (streak === 3) {
    promises.push(createMemory(userId, "milestone", "Achieved a 3-day consistency streak", 5));
  } else if (streak === 7) {
    promises.push(createMemory(userId, "milestone", "Achieved a 7-day consistency streak", 7));
  } else if (streak === 14) {
    promises.push(createMemory(userId, "milestone", "Achieved a 14-day consistency streak", 8));
  } else if (streak === 30) {
    promises.push(createMemory(userId, "milestone", "Achieved a 30-day consistency streak", 10));
  }

  // ── Perfect day ───────────────────────────────
  if (ctx.compliance.today.total > 0 && ctx.compliance.today.completed === ctx.compliance.today.total) {
    // Only store if it's a repeated pattern (not every perfect day)
    const perfectDays = ctx.compliance.overall.percent >= 90
      ? null  // very high compliance — not notable
      : "Completed all tasks today";
    if (perfectDays) {
      promises.push(createMemory(userId, "achievement", perfectDays, 4));
    }
  }

  // ── Plateau detection ─────────────────────────
  const plateau = analysis.patternSignals.find(
    (s) => s.key === "plateau" && s.detected && s.confidence !== "low",
  );
  if (plateau) {
    const monthStr = new Date().toLocaleDateString("en-US", { month: "long", timeZone: "America/Chicago" });
    promises.push(createMemory(
      userId, "pattern",
      `Weight plateau detected in ${monthStr}`,
      6,
    ));
  }

  // ── Disengagement risk ────────────────────────
  const disengagement = analysis.riskSignals.find(
    (s) => s.key === "disengagement" && s.detected &&
           (s.severity === "medium" || s.severity === "high" || s.severity === "critical"),
  );
  if (disengagement) {
    promises.push(createMemory(userId, "risk", "Showed signs of disengagement", 7));
  }

  // ── Compliance drop pattern ───────────────────
  const weekPct = ctx.compliance.week.percent;
  const monthPct = ctx.compliance.month.percent;
  if (monthPct >= 70 && weekPct < 50) {
    promises.push(createMemory(
      userId, "pattern",
      "Weekly task completion dropped significantly below monthly average",
      6,
    ));
  }

  // ── Weekend pattern ───────────────────────────
  const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend && ctx.compliance.today.total > 0 && ctx.compliance.today.percent < 30) {
    promises.push(createMemory(
      userId, "pattern",
      "Tends to miss tasks on weekends",
      5,
    ));
  }

  // ── Goal progress milestones ──────────────────
  const goalPct = ctx.goal?.goalProgress ?? 0;
  if (goalPct >= 25 && goalPct < 30) {
    promises.push(createMemory(userId, "milestone", "Reached 25% of goal", 5));
  } else if (goalPct >= 50 && goalPct < 55) {
    promises.push(createMemory(userId, "milestone", "Reached 50% of goal — halfway there", 7));
  } else if (goalPct >= 75 && goalPct < 80) {
    promises.push(createMemory(userId, "milestone", "Reached 75% of goal — final stretch", 8));
  } else if (goalPct >= 90 && goalPct < 95) {
    promises.push(createMemory(userId, "milestone", "Reached 90% of goal — almost there", 9));
  }

  // ── Goal context ──────────────────────────────
  if (ctx.goal) {
    promises.push(createMemory(
      userId, "coaching_note",
      `Current goal: ${ctx.goal.goalName}`,
      3,
    ));
  }

  await Promise.all(promises);
}

// ═══════════════════════════════════════════════
// FORMAT — prepare memories for briefing context
// ═══════════════════════════════════════════════

/**
 * Format memories into a string block the briefing
 * builder can reference when constructing the coaching
 * message. Returns null if no memories exist.
 */
export function formatMemoriesForContext(memories: AIMemory[]): string | null {
  if (memories.length === 0) return null;

  return memories
    .map((m) => `• [${m.memoryType}] ${m.memoryText}`)
    .join("\n");
}
