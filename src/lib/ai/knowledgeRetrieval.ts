// ─────────────────────────────────────────────
// knowledgeRetrieval — expert knowledge engine
//
// Loads the PULSE coaching knowledge base and
// routes relevant chunks into briefing generation
// based on detected signals and coaching focus.
//
// Deterministic. No LLM. No database queries.
// All knowledge is loaded from static files at
// build/request time.
// ─────────────────────────────────────────────

import "server-only";
import { readFile } from "fs/promises";
import { join }     from "path";
import type {
  ClientAIContext,
  ClientAnalysis,
  CoachSummary,
  KnowledgeChunk,
  ScenarioRoute,
  KnowledgeContext,
} from "./types";

// ═══════════════════════════════════════════════
// FILE PATHS
// ═══════════════════════════════════════════════

const KNOWLEDGE_ROOT = join(process.cwd(), "knowledge");

const PATHS = {
  coreIdentity:    join(KNOWLEDGE_ROOT, "core_identity.md"),
  scenarioRouting: join(KNOWLEDGE_ROOT, "routing", "scenario_routing.json"),
  chunksAll:       join(KNOWLEDGE_ROOT, "chunks", "chunks_all_domains.json"),
  chunksNutrition: join(KNOWLEDGE_ROOT, "chunks", "chunks_nutrition.json"),
} as const;

// ═══════════════════════════════════════════════
// LOADERS (cached in module scope for the process)
// ═══════════════════════════════════════════════

let cachedIdentity: string | null = null;
let cachedRouting:  Record<string, ScenarioRoute> | null = null;
let cachedChunks:   KnowledgeChunk[] | null = null;

async function loadCoreIdentity(): Promise<string> {
  if (cachedIdentity) return cachedIdentity;
  cachedIdentity = await readFile(PATHS.coreIdentity, "utf-8");
  return cachedIdentity;
}

async function loadRouting(): Promise<Record<string, ScenarioRoute>> {
  if (cachedRouting) return cachedRouting;

  const raw = JSON.parse(await readFile(PATHS.scenarioRouting, "utf-8"));

  // Strip _meta key, normalize field names
  const routes: Record<string, ScenarioRoute> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "_meta") continue;
    const v = value as Record<string, unknown>;
    routes[key] = {
      domains:       (v.domains       as string[]) ?? [],
      experts:       (v.experts       as string[]) ?? [],
      priorityCheck: (v.priority_check as string)  ?? "",
      firstQuestion: (v.first_question as string)  ?? "",
    };
  }

  cachedRouting = routes;
  return routes;
}

async function loadChunks(): Promise<KnowledgeChunk[]> {
  if (cachedChunks) return cachedChunks;

  const [allRaw, nutritionRaw] = await Promise.all([
    readFile(PATHS.chunksAll, "utf-8"),
    readFile(PATHS.chunksNutrition, "utf-8"),
  ]);

  const allChunks:       KnowledgeChunk[] = JSON.parse(allRaw);
  const nutritionChunks: KnowledgeChunk[] = JSON.parse(nutritionRaw);

  // Merge, dedup by id
  const seen = new Set<string>();
  const merged: KnowledgeChunk[] = [];
  for (const chunk of [...allChunks, ...nutritionChunks]) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    merged.push(chunk);
  }

  cachedChunks = merged;
  return merged;
}

// ═══════════════════════════════════════════════
// SCENARIO DETECTION
// ═══════════════════════════════════════════════
//
// Maps the current analysis + context to scenario
// keys from the routing map. Uses signal detection,
// compliance state, and coach summary to determine
// which scenarios are active.

function detectScenarios(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
  coachSummary: CoachSummary,
): string[] {
  const scenarios: string[] = [];

  // ── Compliance / engagement ───────────────────
  const weekPct = ctx.compliance.week.percent;
  if (weekPct < 50) {
    scenarios.push("low_compliance");
  }

  // ── Plateau ───────────────────────────────────
  const plateau = analysis.patternSignals.find(
    (s) => s.key === "plateau" && s.detected && s.confidence !== "low",
  );
  if (plateau) {
    scenarios.push("fat_loss_plateau");
    scenarios.push("body_composition_stall");
  }

  // ── Disengagement / burnout ───────────────────
  const disengagement = analysis.riskSignals.find(
    (s) => s.key === "disengagement" && s.detected &&
           (s.severity === "medium" || s.severity === "high" || s.severity === "critical"),
  );
  if (disengagement) {
    scenarios.push("burnout_low_motivation");
  }

  // ── Sleep / recovery signals ──────────────────
  const fatigue = analysis.riskSignals.find(
    (s) => s.category === "recovery" && s.detected,
  );
  if (fatigue) {
    scenarios.push("fatigue_poor_recovery");
    scenarios.push("sleep_poor_not_recovering");
  }

  // ── Progress risk (behind schedule) ───────────
  const progressRisk = analysis.riskSignals.find(
    (s) => s.category === "progress" && s.detected &&
           (s.severity === "medium" || s.severity === "high"),
  );
  if (progressRisk) {
    // Weight-specific context
    const weightTrend = analysis.trendSignals.find((s) => s.metric === "weight");
    if (weightTrend?.direction === "declining" || weightTrend?.direction === "stable") {
      scenarios.push("weight_fluctuation_confusion");
    }
  }

  // ── Stress-related patterns ───────────────────
  const stressPattern = analysis.patternSignals.find(
    (s) => s.key === "consistency" && s.direction === "declining",
  );
  if (stressPattern && weekPct < 60) {
    scenarios.push("stress_eating");
  }

  // ── Coach intervention signals ────────────────
  if (coachSummary.intervention === "intervene" || coachSummary.intervention === "escalate") {
    // High intervention + no specific scenario → general habit focus
    if (scenarios.length === 0) {
      scenarios.push("client_trains_but_nutrition_poor");
    }
  }

  // ── Scale obsession (weight logged frequently but body comp not) ──
  if (ctx.weightLog.length > 10 && ctx.progressLog.length < 2) {
    scenarios.push("scale_obsession");
  }

  // ── Default: if no scenarios detected, provide habit formation ──
  if (scenarios.length === 0) {
    // Good state — reinforce habits
    if (ctx.streak >= 7) {
      scenarios.push("milestone_hit_feeling_empty");
    } else {
      scenarios.push("new_client_goal_unclear");
    }
  }

  return scenarios;
}

// ═══════════════════════════════════════════════
// CHUNK SELECTION
// ═══════════════════════════════════════════════

/**
 * Select the best 3–5 chunks from the active domains.
 *
 * Strategy:
 *   1. Filter chunks to active domains
 *   2. Sort by priority (1 first), then prefer chunks
 *      whose tags overlap with detected scenario keys
 *   3. Take top 5, ensuring domain diversity (max 2 per domain)
 */
function selectChunks(
  allChunks: KnowledgeChunk[],
  activeDomains: string[],
  scenarioKeys: string[],
): KnowledgeChunk[] {
  const domainSet = new Set(activeDomains);

  // Filter to active domains
  const candidates = allChunks.filter((c) => domainSet.has(c.domain));

  if (candidates.length === 0) return [];

  // Score each chunk
  const scored = candidates.map((chunk) => {
    let score = 0;

    // Priority 1 chunks get a boost
    if (chunk.priority === 1) score += 10;

    // Tag overlap with scenario keys
    const tagSet = new Set(chunk.tags.map((t) => t.toLowerCase()));
    for (const key of scenarioKeys) {
      // Check if any scenario keyword appears in chunk tags
      const keyParts = key.split("_");
      for (const part of keyParts) {
        if (tagSet.has(part)) score += 3;
      }
    }

    // Domain appearing earlier in activeDomains = higher priority
    const domainIndex = activeDomains.indexOf(chunk.domain);
    if (domainIndex >= 0) score += (activeDomains.length - domainIndex);

    return { chunk, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select with domain diversity (max 2 per domain)
  const selected: KnowledgeChunk[] = [];
  const domainCount: Record<string, number> = {};

  for (const { chunk } of scored) {
    if (selected.length >= 5) break;
    const count = domainCount[chunk.domain] ?? 0;
    if (count >= 2) continue;
    selected.push(chunk);
    domainCount[chunk.domain] = count + 1;
  }

  return selected;
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Build the knowledge context for briefing generation.
 *
 * Loads the routing map, detects active scenarios from
 * the current analysis, retrieves relevant chunks, and
 * returns a structured KnowledgeContext object.
 */
export async function buildKnowledgeContext(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
  coachSummary: CoachSummary,
): Promise<KnowledgeContext> {
  // Load all knowledge files (cached after first call)
  const [coreIdentity, routing, allChunks] = await Promise.all([
    loadCoreIdentity(),
    loadRouting(),
    loadChunks(),
  ]);

  // Detect which scenarios apply
  const matchedScenarios = detectScenarios(ctx, analysis, coachSummary);

  // Resolve domains from matched scenarios
  const domainSet = new Set<string>();
  const priorityChecks: string[] = [];

  for (const scenarioKey of matchedScenarios) {
    const route = routing[scenarioKey];
    if (!route) continue;
    for (const domain of route.domains) {
      domainSet.add(domain);
    }
    if (route.priorityCheck) {
      priorityChecks.push(route.priorityCheck);
    }
  }

  const activeDomains = Array.from(domainSet);

  // Select relevant chunks
  const snippets = selectChunks(allChunks, activeDomains, matchedScenarios);

  return {
    coreIdentity,
    matchedScenarios,
    activeDomains,
    snippets,
    priorityChecks,
  };
}

/**
 * Format knowledge snippets for injection into the
 * coaching message builder. Returns a compact string
 * block or null if no snippets.
 */
export function formatKnowledgeForContext(knowledge: KnowledgeContext): string | null {
  if (knowledge.snippets.length === 0) return null;

  const lines = knowledge.snippets.map(
    (s) => `[${s.domain}/${s.topic}] ${s.text}`,
  );

  return lines.join("\n\n");
}
