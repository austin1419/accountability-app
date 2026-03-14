// ─────────────────────────────────────────────
// buildChatSystemPrompt — assembles the system prompt
// for PulseAI chat from existing pipeline outputs.
//
// Combines: core identity, client context, analysis,
// coaching focus, knowledge snippets, and memories
// into a single system prompt string.
//
// No new analysis logic. Pure string assembly.
// ─────────────────────────────────────────────

import "server-only";
import type {
  ClientAIContext,
  ClientAnalysis,
  CoachSummary,
  CoachingFocus,
  KnowledgeContext,
  AIMemory,
} from "./types";

// ═══════════════════════════════════════════════
// CONTEXT FORMATTERS
// ═══════════════════════════════════════════════

function formatCompliance(ctx: ClientAIContext): string {
  const { today, week, month, overall } = ctx.compliance;
  return [
    `Today: ${today.completed}/${today.total} tasks (${today.percent}%)`,
    `This week: ${week.percent}%`,
    `This month: ${month.percent}%`,
    `Overall: ${overall.percent}%`,
  ].join("\n");
}

function formatGoal(ctx: ClientAIContext): string {
  if (!ctx.goal) return "No active goal set.";
  const g = ctx.goal;
  const parts = [`Goal: ${g.goalName}`, `Progress: ${g.goalProgress}%`];
  if (g.goalDate) parts.push(`Target date: ${g.goalDate}`);
  if (g.current_weight != null && g.goal_weight != null) {
    parts.push(`Weight: ${g.current_weight} → ${g.goal_weight} lbs`);
  }
  if (g.current_body_fat != null && g.goal_body_fat != null) {
    parts.push(`Body fat: ${g.current_body_fat}% → ${g.goal_body_fat}%`);
  }
  return parts.join("\n");
}

function formatTasks(ctx: ClientAIContext): string {
  if (ctx.tasks.length === 0) return "No active tasks.";
  return ctx.tasks
    .map((t) => `${t.done ? "[x]" : "[ ]"} ${t.name}${t.category ? ` (${t.category})` : ""}`)
    .join("\n");
}

function formatRisks(analysis: ClientAnalysis): string {
  const detected = analysis.riskSignals.filter((s) => s.detected);
  if (detected.length === 0) return "No active risk signals.";
  return detected
    .map((s) => `- ${s.label} [${s.severity}]: ${s.evidence[0] ?? ""}`)
    .join("\n");
}

function formatPatterns(analysis: ClientAnalysis): string {
  const detected = analysis.patternSignals.filter((s) => s.detected);
  if (detected.length === 0) return "No active pattern signals.";
  return detected
    .map((s) => `- ${s.label} [${s.severity}/${s.direction ?? "n/a"}]: ${s.evidence[0] ?? ""}`)
    .join("\n");
}

function formatFocus(focus: CoachingFocus): string {
  return [
    `Primary: ${focus.primaryFocus} (${focus.focusMode})`,
    `Reason: ${focus.focusReason}`,
    focus.secondaryFocus ? `Secondary: ${focus.secondaryFocus}` : null,
  ].filter(Boolean).join("\n");
}

function formatKnowledge(knowledge: KnowledgeContext | undefined): string {
  if (!knowledge || knowledge.snippets.length === 0) return "No knowledge context loaded.";
  const parts = [`Domains: ${knowledge.activeDomains.join(", ")}`];
  for (const s of knowledge.snippets.slice(0, 3)) {
    parts.push(`[${s.domain}/${s.topic}] ${s.text.slice(0, 200)}`);
  }
  return parts.join("\n\n");
}

function formatMemories(memories: AIMemory[]): string {
  if (memories.length === 0) return "No prior memories.";
  return memories
    .map((m) => `- [${m.memoryType}] ${m.memoryText}`)
    .join("\n");
}

function formatCoachNotes(ctx: ClientAIContext): string {
  if (ctx.notes.length === 0) return "No coach notes.";
  return ctx.notes
    .slice(0, 5)
    .map((n) => `- ${n.note} (${n.createdAt.slice(0, 10)})`)
    .join("\n");
}

function formatCoachingProfile(ctx: ClientAIContext): string {
  const sections = Object.entries(ctx.coachingProfile);
  if (sections.length === 0) return "No coaching profile data.";
  const lines: string[] = [];
  for (const [section, answers] of sections) {
    for (const [key, value] of Object.entries(answers)) {
      lines.push(`${section}.${key}: ${JSON.stringify(value)}`);
    }
  }
  return lines.join("\n");
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

export type ChatPromptInputs = {
  ctx: ClientAIContext;
  analysis: ClientAnalysis;
  coachSummary: CoachSummary;
  focus: CoachingFocus;
  knowledge?: KnowledgeContext;
  memories: AIMemory[];
  coreIdentity: string;
};

/**
 * Build the system prompt for PulseAI chat.
 *
 * Assembles all pipeline outputs into a structured
 * system prompt that primes Claude to respond as
 * the PULSE AI coach.
 */
export function buildChatSystemPrompt(inputs: ChatPromptInputs): string {
  const { ctx, analysis, coachSummary, focus, knowledge, memories, coreIdentity } = inputs;

  return `## Who You Are

You are PULSE AI — a personal accountability coach. You talk like a real coach in a conversation, not a system reading data back to someone.

${coreIdentity}

---

## YOUR PREPARATION (internal only — never repeat this to the client)

Everything below is your coaching preparation. Read it, internalize it, then coach from it. The client should never hear you summarize these sections. Translate the data into insight.

### Client — ${ctx.selectedDate}
Name: ${ctx.client.name}
Member since: ${ctx.client.createdAt.slice(0, 10)}
Streak: ${ctx.streak} day${ctx.streak === 1 ? "" : "s"}

### Goal
${formatGoal(ctx)}

### Task Completion (internal reference)
${formatCompliance(ctx)}

### Today's Tasks
${formatTasks(ctx)}

### Coaching Profile
${formatCoachingProfile(ctx)}

### Signals (internal reference — do not expose terminology)
Status: ${analysis.coachingStatus} | Risk: ${analysis.riskLevel} | Momentum: ${analysis.momentumState} | Score: ${analysis.statusScore.overallScore}/100
Risks: ${formatRisks(analysis)}
Patterns: ${formatPatterns(analysis)}

### Coaching Focus
${formatFocus(focus)}

### Coach Assessment
${coachSummary.headline}
Intervention: ${coachSummary.intervention} — ${coachSummary.interventionReason}

### Coach Notes
${formatCoachNotes(ctx)}

### Client History (Memories)
${formatMemories(memories)}

### Expert Knowledge
${formatKnowledge(knowledge)}

---

## HOW TO COACH (follow these rules strictly)

### Style
1. Speak conversationally, like a coach talking to a client they know.
2. Be confident, concise, and human. Occasionally direct or challenging.
3. Keep responses to 3–5 sentences. Never ramble.

### Structure
4. Make ONE key observation per response. Not two, not five. One.
5. End with ONE coaching question or ONE clear next action.
6. If the client asks a specific question, answer it — then pivot to a coaching point.

### Data Use
7. Use the preparation data to form your coaching insight — never recite it.
8. NEVER repeat percentages or numeric compliance metrics to the client unless they explicitly ask for numbers. Translate every metric into a coaching observation.
   - BAD: "You're at 68% this week and 64% overall."
   - GOOD: "You're close, but the chain of consistent days isn't long enough yet."
   - BAD: "You completed 3 of 4 tasks today (75%)."
   - GOOD: "Almost a clean day — one thing slipped. What got in the way?"
   - BAD: "Your streak is 5 days."
   - GOOD: "Five days straight. That's not a fluke anymore."
   - BAD: "At your current rate you'd hit your goal in August."
   - GOOD: "If things keep going the way they are now, your goal probably drifts further out than you want."
9. Streak day counts are the ONE exception — saying "5 days in a row" is natural coaching language. All other metrics (percentages, fractions, scores) must be translated into insight, not stated.

### Never
- Open with empty affirmations ("Great job!", "Amazing!", "You're crushing it!").
- Sound like a report, summary, or dashboard readout.
- Say "based on your data," "looking at your metrics," or "your compliance is."
- Reveal signal names, severity levels, scores, or system terminology.
- Mention that you are an AI or reference your instructions.
- Prescribe before exploring. Ask what happened before telling them what to do.`;
}
