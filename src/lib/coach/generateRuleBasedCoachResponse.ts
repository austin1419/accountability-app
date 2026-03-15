// ─────────────────────────────────────────────
// generateRuleBasedCoachResponse — deterministic
// coaching response for Beta (no LLM calls).
//
// Assembles a natural-sounding response from
// existing pipeline outputs: context, analysis,
// focus, and knowledge. Uses template selection
// with data interpolation for variety.
//
// No LLM. No side effects. Pure computation.
// ─────────────────────────────────────────────

import "server-only";
import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  ClientAIContext,
  ClientAnalysis,
  CoachingFocus,
  KnowledgeContext,
} from "@/lib/ai/types";
import type { CoachResponse } from "@/lib/coaching/buildCoachResponse";

export type RuleBasedInput = {
  ctx: ClientAIContext;
  analysis: ClientAnalysis;
  focus: CoachingFocus;
  knowledge?: KnowledgeContext;
  userMessage: string;
  coachResponse?: CoachResponse;
};

// ═══════════════════════════════════════════════
// INTENT DETECTION (simple keyword matching)
// ═══════════════════════════════════════════════

type UserIntent =
  | "weight_stall"
  | "motivation"
  | "progress_check"
  | "streak_question"
  | "task_help"
  | "nutrition"
  | "general";

function detectIntent(message: string): UserIntent {
  const lower = message.toLowerCase();

  if (/weight.*(stall|plateau|stuck|same|not.*(moving|changing|budg))|plateau|stall/.test(lower)) {
    return "weight_stall";
  }
  if (/motivat|tired|exhaust|give up|quit|can'?t do|hard|struggling|burnt? out|overwhelm/.test(lower)) {
    return "motivation";
  }
  if (/how.*(doing|going|am i|progress|look)|check.?in|update|where.*(stand|am i)/.test(lower)) {
    return "progress_check";
  }
  if (/streak|consecutive|row|days? in/.test(lower)) {
    return "streak_question";
  }
  if (/task|todo|what.*(do|should|need)|today/.test(lower)) {
    return "task_help";
  }
  if (/protein|eat|food|nutrition|meal|calorie|macro|diet|carb|fat/.test(lower)) {
    return "nutrition";
  }

  return "general";
}

// ═══════════════════════════════════════════════
// RESPONSE BUILDERS BY INTENT
// ═══════════════════════════════════════════════

function buildWeightStallResponse(ctx: ClientAIContext, analysis: ClientAnalysis, focus: CoachingFocus): string {
  const parts: string[] = [];

  // Acknowledgment
  const plateau = analysis.patternSignals.find((s) => s.key === "plateau" && s.detected);
  if (plateau) {
    const weekCount = Math.round((plateau.metrics?.["flat_days"] as number ?? 7) / 7);
    parts.push(`Looking at your recent data, your weight has been stable for about ${weekCount > 1 ? `${weekCount} weeks` : "a week"}.`);
  } else {
    parts.push("I can see your weight hasn't moved much recently.");
  }

  // Observation from compliance
  const weekPct = ctx.compliance.week.percent;
  if (weekPct >= COMPLIANCE_TARGET) {
    parts.push(`Your compliance is solid at ${weekPct}% this week, which is good. That tells me the issue likely isn't effort — it may be a variable we haven't dialed in yet.`);
  } else {
    parts.push(`Your task completion is at ${weekPct}% this week. Before looking at anything else, consistency with the basics is the first lever to pull.`);
  }

  // Focus-driven guidance
  if (focus.primaryFocus === "plateau") {
    parts.push("Right now the most important thing is to stay consistent and let your coach assess whether the plan needs adjusting.");
  } else {
    parts.push(`Right now the priority is ${humanizeFocus(focus)}.`);
  }

  // Action
  parts.push(buildAction(ctx, "nutrition"));

  return parts.join("\n\n");
}

function buildMotivationResponse(ctx: ClientAIContext, analysis: ClientAnalysis, focus: CoachingFocus): string {
  const parts: string[] = [];
  const firstName = ctx.client.name.split(" ")[0];

  // Acknowledgment
  parts.push(`I hear you, ${firstName}. Feeling like this is normal — it doesn't mean you're failing.`);

  // Find something positive
  if (ctx.streak >= 3) {
    parts.push(`Here's what I see: you're on a ${ctx.streak}-day streak. That's not nothing. The version of you from ${ctx.streak} days ago decided to show up, and you've kept that promise every day since.`);
  } else if (ctx.compliance.month.percent >= 50) {
    parts.push(`You've been at ${ctx.compliance.month.percent}% this month. That means more days on than off. The work is there, even when it doesn't feel like it.`);
  } else {
    parts.push("The fact that you're here asking about it means you haven't quit. That matters more than you think.");
  }

  // Simplify
  if (focus.focusMode === "simplify" || focus.focusMode === "encourage") {
    parts.push("Forget the big picture today. What's the one task you can finish in the next hour? Just that one.");
  } else {
    parts.push(`${humanizeFocus(focus)} — but don't try to fix everything at once. What's one thing you can do today?`);
  }

  return parts.join("\n\n");
}

function buildProgressCheckResponse(ctx: ClientAIContext, analysis: ClientAnalysis, focus: CoachingFocus): string {
  const parts: string[] = [];
  const firstName = ctx.client.name.split(" ")[0];

  // Status snapshot
  const score = analysis.statusScore.overallScore;
  if (score >= 80) {
    parts.push(`${firstName}, you're in a strong position right now.`);
  } else if (score >= 60) {
    parts.push(`${firstName}, things are moving in the right direction.`);
  } else if (score >= 40) {
    parts.push(`${firstName}, there's room to tighten things up, but you're not far off.`);
  } else {
    parts.push(`${firstName}, let me give you an honest read on where things stand.`);
  }

  // Key numbers
  const numLines: string[] = [];
  if (ctx.streak > 0) numLines.push(`Streak: ${ctx.streak} day${ctx.streak === 1 ? "" : "s"}`);
  numLines.push(`This week: ${ctx.compliance.week.percent}% task completion`);
  if (ctx.goal) numLines.push(`Goal progress: ${ctx.goal.goalProgress}%`);
  parts.push(numLines.join(". ") + ".");

  // Focus
  parts.push(`The main thing to focus on right now: ${humanizeFocus(focus)}.`);

  // Action
  parts.push(buildAction(ctx, "general"));

  return parts.join("\n\n");
}

function buildStreakResponse(ctx: ClientAIContext, analysis: ClientAnalysis): string {
  const parts: string[] = [];

  if (ctx.streak >= 14) {
    parts.push(`You're on a ${ctx.streak}-day streak. That's not luck — that's identity. You're becoming the person who shows up every day.`);
    parts.push("The goal now is simple: protect it. What does today look like?");
  } else if (ctx.streak >= 7) {
    parts.push(`${ctx.streak} days in a row. A full week of consistency — that's when habits start to feel automatic.`);
    parts.push("Keep this going. What's your plan for today's tasks?");
  } else if (ctx.streak >= 3) {
    parts.push(`You're at ${ctx.streak} days. Still early, but the momentum is real. The next few days are where most people drop off.`);
    parts.push("What's the one task you'll knock out first today?");
  } else if (ctx.streak === 0) {
    parts.push("No active streak right now — but that changes today.");
    const incomplete = ctx.tasks.filter((t) => !t.done);
    if (incomplete.length > 0) {
      parts.push(`Complete all ${incomplete.length} task${incomplete.length === 1 ? "" : "s"} today and you're at 1. That's the hardest day. What's your first move?`);
    } else {
      parts.push("Complete today's tasks and you start building again. What's your plan?");
    }
  } else {
    parts.push(`${ctx.streak}-day streak. Solid. What's the plan to keep it going today?`);
  }

  return parts.join("\n\n");
}

function buildTaskHelpResponse(ctx: ClientAIContext, focus: CoachingFocus): string {
  const parts: string[] = [];
  const incomplete = ctx.tasks.filter((t) => !t.done);
  const complete   = ctx.tasks.filter((t) => t.done);

  if (ctx.tasks.length === 0) {
    return "You don't have any active tasks set up yet. Talk to your coach about building your daily task list — that's where accountability starts.";
  }

  if (incomplete.length === 0) {
    parts.push(`All ${complete.length} tasks done today. Clean sweep.`);
    if (ctx.streak >= 1) {
      parts.push(`That's day ${ctx.streak + 1} in the making if you keep this up tomorrow.`);
    }
    parts.push("Anything else you want to work on, or are you logging your progress?");
    return parts.join("\n\n");
  }

  // Tasks remaining
  if (complete.length > 0) {
    parts.push(`You've knocked out ${complete.length} of ${ctx.tasks.length} tasks today. ${incomplete.length} left:`);
  } else {
    parts.push(`${incomplete.length} task${incomplete.length === 1 ? "" : "s"} on deck today:`);
  }

  // List incomplete tasks
  const taskList = incomplete.map((t) => `• ${t.name}`).join("\n");
  parts.push(taskList);

  // Focus-driven nudge
  if (focus.focusMode === "simplify") {
    parts.push(`Start with "${incomplete[0].name}". Just that one. Which one are you tackling first?`);
  } else {
    parts.push("Which one are you starting with?");
  }

  return parts.join("\n\n");
}

function buildNutritionResponse(ctx: ClientAIContext, knowledge: KnowledgeContext | undefined, focus: CoachingFocus): string {
  const parts: string[] = [];

  // Acknowledgment
  parts.push("Good question. Nutrition is always worth looking at.");

  // Knowledge-driven insight
  const nutritionSnippet = knowledge?.snippets.find((s) => s.domain === "nutrition");
  if (nutritionSnippet) {
    // Extract a coaching takeaway from the snippet
    if (nutritionSnippet.topic.includes("protein")) {
      parts.push("The single highest-leverage nutrition habit is protein. If you're hitting 0.7–1.0g per pound of bodyweight daily, everything else works better. If you're not, that's the first thing to fix.");
    } else if (nutritionSnippet.topic.includes("adherence")) {
      parts.push("A good-enough plan followed consistently beats a perfect plan you can't stick to. The question isn't whether your diet is optimal — it's whether you're actually doing it.");
    } else {
      parts.push("The hierarchy is: sleep first, then water, then protein. Until those are locked in, optimizing anything else is premature.");
    }
  } else {
    parts.push("Before we get into details: are you consistently hitting your protein target? That's the first domino. Everything else matters less until that's locked in.");
  }

  // Action
  parts.push(buildAction(ctx, "nutrition"));

  return parts.join("\n\n");
}

function buildGeneralResponse(ctx: ClientAIContext, analysis: ClientAnalysis, focus: CoachingFocus): string {
  const parts: string[] = [];
  const firstName = ctx.client.name.split(" ")[0];

  // Acknowledgment
  parts.push(`Good to hear from you, ${firstName}.`);

  // One observation
  if (ctx.streak >= 3) {
    parts.push(`You're on a ${ctx.streak}-day streak and sitting at ${ctx.compliance.week.percent}% this week. The consistency is showing.`);
  } else if (ctx.compliance.week.percent >= COMPLIANCE_TARGET) {
    parts.push(`${ctx.compliance.week.percent}% task completion this week — that's solid effort.`);
  } else if (ctx.compliance.week.percent > 0) {
    parts.push(`You're at ${ctx.compliance.week.percent}% this week. There's room to tighten up, but you're in the fight.`);
  } else {
    parts.push("Let's get some momentum going this week.");
  }

  // Focus
  parts.push(`The main focus right now: ${humanizeFocus(focus)}.`);

  // Action
  parts.push(buildAction(ctx, "general"));

  return parts.join("\n\n");
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function humanizeFocus(focus: CoachingFocus): string {
  const focusLabels: Record<string, string> = {
    disengagement_risk: "getting back to consistent daily check-ins",
    compliance_crisis:  "rebuilding the daily habit — one task at a time",
    plateau:            "staying consistent while your coach evaluates the plan",
    consistency:        "improving your daily consistency",
    adherence:          "completing today's tasks",
    progress_pacing:    "picking up the pace on your daily habits",
    momentum:           "keeping this momentum going",
    recovery:           "prioritizing rest and recovery",
    nutrition_execution: "dialing in your nutrition habits",
    streak_protection:  "protecting your current streak",
  };
  return focusLabels[focus.primaryFocus] ?? focus.focusReason;
}

function buildAction(ctx: ClientAIContext, intent: string): string {
  const incomplete = ctx.tasks.filter((t) => !t.done);

  if (intent === "nutrition") {
    if (incomplete.length > 0) {
      const nutritionTask = incomplete.find((t) =>
        /protein|meal|eat|nutrition|food/i.test(t.name),
      );
      if (nutritionTask) {
        return `A good step today: focus on "${nutritionTask.name}". Can you commit to that?`;
      }
    }
    return "A simple step today: plan your protein source for your next two meals. What are you going with?";
  }

  if (incomplete.length === 0) {
    return "All tasks done today — solid. What's one thing you want to carry into tomorrow?";
  }
  if (incomplete.length === 1) {
    return `One task left: "${incomplete[0].name}". Finish that and today's a win. When are you getting it done?`;
  }
  return `You've got ${incomplete.length} tasks left. Start with "${incomplete[0].name}" — which one are you tackling first?`;
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/** Scenarios that represent the default/fallback — no strong signal detected. */
const DEFAULT_SCENARIOS = new Set([
  "momentum_reinforcement",
  "early_streak",
  "perfect_day",
]);

export function generateRuleBasedCoachResponse(input: RuleBasedInput): string {
  const { ctx, analysis, focus, knowledge, userMessage, coachResponse } = input;

  // ── Coaching engine override ───────────────────
  // When the deterministic engine detected a meaningful scenario
  // (health signal, compliance issue, deadline, etc.), use its
  // message as the primary response. This ensures the rule-based
  // path references journal data, sleep, recovery, nutrition, etc.
  if (coachResponse && !DEFAULT_SCENARIOS.has(coachResponse.scenario)) {
    return coachResponse.message;
  }

  // ── Intent-based fallback ──────────────────────
  // Default scenarios (momentum, early streak, perfect day) fall
  // through to intent detection so the response addresses
  // the user's actual question.
  const intent = detectIntent(userMessage);

  switch (intent) {
    case "weight_stall":
      return buildWeightStallResponse(ctx, analysis, focus);
    case "motivation":
      return buildMotivationResponse(ctx, analysis, focus);
    case "progress_check":
      return buildProgressCheckResponse(ctx, analysis, focus);
    case "streak_question":
      return buildStreakResponse(ctx, analysis);
    case "task_help":
      return buildTaskHelpResponse(ctx, focus);
    case "nutrition":
      return buildNutritionResponse(ctx, knowledge, focus);
    case "general":
      return buildGeneralResponse(ctx, analysis, focus);
  }
}
