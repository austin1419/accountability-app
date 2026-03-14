// ─────────────────────────────────────────────
// AI Context & Signal types
//
// ClientAIContext: structured input assembled by buildClientContext.
// BaseSignal + variants: structured output of the detection engine.
//
// All signals are deterministic, explainable, and carry
// human-readable evidence for downstream consumers.
// ─────────────────────────────────────────────

import type { GoalMetrics } from "@/lib/computeGoalProgress";
import type { ProgressTrends, MetricDelta, StatusScore } from "@/lib/server-queries";

// Re-export for convenience
export type { ProgressTrends, MetricDelta, StatusScore };

// ═══════════════════════════════════════════════
// CONTEXT TYPES (input to detection engine)
// ═══════════════════════════════════════════════

export type ClientIdentity = {
  userId:    string;
  name:      string;
  email:     string;
  createdAt: string;   // ISO timestamp
};

export type GoalContext = GoalMetrics & {
  id:           string;
  goalName:     string;
  goalDate:     string | null;  // YYYY-MM-DD
  goalProgress: number;         // 0–100 from computeGoalProgress
};

export type ComplianceContext = {
  today: {
    completed: number;
    total:     number;
    percent:   number;
  };
  week: {
    percent: number;
  };
  month: {
    percent: number;
  };
  overall: {
    percent: number;
  };
};

export type TaskSnapshot = {
  id:       string;
  name:     string;
  category: string | null;
  done:     boolean;         // completion status for selectedDate
};

export type WeightLogEntry = {
  date:   string;   // YYYY-MM-DD
  weight: number;
};

export type ProgressLogEntry = {
  date:             string;   // YYYY-MM-DD
  bodyFat:          number | null;
  smm:              number | null;
  performanceValue: number | null;
};

export type ProgressSummaryContext = {
  weight:  { week: MetricDelta | null; month: MetricDelta | null } | null;
  bodyFat: { week: MetricDelta | null; month: MetricDelta | null } | null;
  smm:     { week: MetricDelta | null; month: MetricDelta | null } | null;
};

export type CoachingProfileContext = Record<string, Record<string, unknown>>;

export type ClientNote = {
  id:        string;
  note:      string;
  createdAt: string;   // ISO timestamp
};

export type ClientAIContext = {
  selectedDate:    string;
  builtAt:         string;
  client:          ClientIdentity;
  goal:            GoalContext | null;
  compliance:      ComplianceContext;
  tasks:           TaskSnapshot[];
  streak:          number;
  progressTrends:  ProgressTrends | null;
  progressSummary: ProgressSummaryContext;
  statusScore:     StatusScore;
  weightLog:       WeightLogEntry[];
  progressLog:     ProgressLogEntry[];
  coachingProfile: CoachingProfileContext;
  notes:           ClientNote[];
};


// ═══════════════════════════════════════════════
// SIGNAL TYPES (output of detection engine)
// ═══════════════════════════════════════════════

// ── Shared enums ─────────────────────────────

export type SignalSeverity   = "none" | "low" | "medium" | "high" | "critical";
export type SignalConfidence = "low" | "medium" | "high";
export type SignalDirection  = "improving" | "stable" | "declining" | "no_data";

// ── BaseSignal ───────────────────────────────
// Every detected signal conforms to this shape.
// Consumers can iterate any signal array and render
// evidence without knowing the specific signal type.

export type BaseSignal = {
  key:          string;                                     // machine-readable identifier
  label:        string;                                     // human-readable explanation
  detected:     boolean;                                    // whether the condition is active
  severity:     SignalSeverity;
  confidence:   SignalConfidence;
  direction?:   SignalDirection;
  evidence:     string[];                                   // human-readable evidence trail
  metrics?:     Record<string, number | string | null>;     // supporting numeric data
};

// ── RiskSignal ───────────────────────────────
// Produced by detectRisk.ts

export type RiskCategory =
  | "compliance"
  | "engagement"
  | "progress"
  | "behavior"
  | "recovery";    // future-ready

export type RiskSignal = BaseSignal & {
  category: RiskCategory;
};

// ── PatternSignal ────────────────────────────
// Produced by detectPatterns.ts

export type PatternCategory =
  | "streak"
  | "plateau"
  | "trend"
  | "consistency"
  | "adherence";

export type PatternSignal = BaseSignal & {
  category: PatternCategory;
};

// ── TrendSignal ──────────────────────────────
// One per tracked metric, with windowed deltas.

export type TrendCategory = "trend";

export type TrendWindow = "7d" | "14d" | "30d" | "60d" | "90d";

export type TrendWindowData = {
  change:   number;
  velocity: number | null;
};

export type TrendSignal = BaseSignal & {
  category:      TrendCategory;
  metric:        string;                                    // "weight", "body_fat", "smm", "performance"
  windows:       Partial<Record<TrendWindow, TrendWindowData>>;
  projectedDate: string | null;
  goalDateGap:   number | null;                             // negative = ahead, positive = behind
};

// ── Top-level derived states ─────────────────
// These are computed FROM signals, not independently.

export type RiskLevel      = "low" | "moderate" | "high" | "critical";
export type MomentumState  = "surging" | "building" | "steady" | "slipping" | "stalled";
export type CoachingStatus = "thriving" | "on_track" | "needs_attention" | "at_risk" | "critical";

// ── ClientAnalysis ───────────────────────────
// Single output object from analyzeClientContext.
// Powers coach summaries, client insights, intervention
// logic, and PulseAI chat.

export type ClientAnalysis = {
  /** Date this analysis was produced for */
  selectedDate:    string;

  /** Timestamp of analysis */
  analyzedAt:      string;

  /** Risk signals by category */
  riskSignals:     RiskSignal[];

  /** Behavioral pattern signals */
  patternSignals:  PatternSignal[];

  /** Metric trend signals */
  trendSignals:    TrendSignal[];

  /** All signals flattened for easy iteration / filtering */
  allSignals:      BaseSignal[];

  /** Overall risk — derived from highest severity across risk signals */
  riskLevel:       RiskLevel;

  /** Overall momentum — derived from pattern signals */
  momentumState:   MomentumState;

  /** Coaching status — derived from risk + momentum combined */
  coachingStatus:  CoachingStatus;

  /** Combined status score passthrough from deterministic engine */
  statusScore:     StatusScore;
};


// ═══════════════════════════════════════════════
// SUMMARY TYPES (coach-facing & client-facing)
// ═══════════════════════════════════════════════

// ── Shared ───────────────────────────────────

export type SummaryPriority = "low" | "medium" | "high" | "urgent";

export type SummaryItem = {
  title:     string;          // short headline
  detail:    string;          // 1–2 sentence explanation
  priority:  SummaryPriority;
  signalKey: string;          // key of the originating signal
  evidence:  string[];        // forwarded from signal.evidence
};

// ── CoachSummary ─────────────────────────────
// Built by buildCoachSummary.ts for the coach dashboard.

export type InterventionPriority = "none" | "monitor" | "nudge" | "intervene" | "escalate";

export type CoachSummary = {
  /** Client name for display */
  clientName:          string;

  /** Date the summary covers */
  selectedDate:        string;

  /** Top-level status reads */
  coachingStatus:      CoachingStatus;
  riskLevel:           RiskLevel;
  momentumState:       MomentumState;
  overallScore:        number;            // 0–100 from statusScore

  /** Detected risks, ordered by priority */
  risks:               SummaryItem[];

  /** Coaching focus areas derived from patterns */
  focusAreas:          SummaryItem[];

  /** Behavioral pattern observations */
  patterns:            SummaryItem[];

  /** Suggested intervention priority */
  intervention:        InterventionPriority;
  interventionReason:  string;

  /** One-line headline for the coach dashboard card */
  headline:            string;
};

// ── ClientSummary ────────────────────────────
// Built by buildClientSummary.ts for client-facing insights.

export type ClientSummary = {
  /** Client name for display */
  clientName:          string;

  /** Date the summary covers */
  selectedDate:        string;

  /** Top-level momentum read */
  momentumState:       MomentumState;

  /** Progress interpretation */
  progressItems:       SummaryItem[];

  /** Positive reinforcement signals */
  wins:                SummaryItem[];

  /** Focus suggestions (actionable, encouraging tone) */
  focusSuggestions:    SummaryItem[];

  /** One-line motivational headline */
  headline:            string;
};


// ═══════════════════════════════════════════════
// FEATURE READINESS (AI feature gating)
// ═══════════════════════════════════════════════

/** All AI features that can be gated by data readiness */
export type AIFeatureKey = "dailyBriefing";

export type AIFeatureReadiness = {
  /** Which feature this readiness check is for */
  featureKey:           AIFeatureKey;

  /** Whether the feature has enough data to activate */
  available:            boolean;

  /** Human-readable reason if not available (null when available) */
  blockedReason:        string | null;

  /** Membership duration — days since account creation */
  memberDays:                number;
  minimumMemberDaysRequired: number;
  memberDaysMet:             boolean;

  /** Distinct days with at least 1 task log entry */
  taskDaysLogged:            number;
  minimumTaskDaysRequired:   number;
  taskDaysMet:               boolean;

  /** Weight + progress log entries (union of distinct dates) */
  metricLogsCount:           number;
  minimumMetricLogsRequired: number;
  metricLogsMet:             boolean;
};

/** Map of all AI feature readiness states */
export type AIReadinessMap = Record<AIFeatureKey, AIFeatureReadiness>;


// ═══════════════════════════════════════════════
// DAILY BRIEFING (presentation layer)
// ═══════════════════════════════════════════════

export type BriefingMomentum = "building" | "steady" | "declining" | "at_risk";
export type BriefingRisk     = "low" | "medium" | "high";

/** Coaching message — reads like a short note from a real coach. */
export type CoachingMessage = {
  /** Brief summary of how things are going */
  snapshot: string;
  /** One meaningful observation based on the data */
  insight:  string;
  /** Short coaching statement */
  guidance: string;
  /** One clear, actionable suggestion */
  action:   string;
};

/** Supporting metric shown below the coaching message */
export type BriefingMetric = {
  label:  string;
  value:  string;
  status: "gold" | "neutral" | "red";
};

export type DailyBriefing = {
  id:              string;
  generatedAt:     string;
  greeting:        string;
  momentumState:   BriefingMomentum;
  riskLevel:       BriefingRisk;
  coachingMessage: CoachingMessage;
  metrics:         BriefingMetric[];
  sourceSignals:   string[];
};


// ═══════════════════════════════════════════════
// AI MEMORY (coaching engine memory layer)
// ═══════════════════════════════════════════════

export type AIMemoryType =
  | "pattern"
  | "milestone"
  | "preference"
  | "risk"
  | "achievement"
  | "coaching_note";

export type AIMemory = {
  id:              string;
  userId:          string;
  memoryType:      AIMemoryType;
  memoryText:      string;
  importanceScore: number;       // 1–10
  createdAt:       string;       // ISO timestamp
  lastUsedAt:      string;       // ISO timestamp
};


// ═══════════════════════════════════════════════
// KNOWLEDGE RETRIEVAL (expert knowledge layer)
// ═══════════════════════════════════════════════

/** A single knowledge chunk from the knowledge base. */
export type KnowledgeChunk = {
  id:       string;
  domain:   string;
  topic:    string;
  tags:     string[];
  priority: number;       // 1 = foundational, 2 = secondary
  expert:   string;
  text:     string;
};

/** A scenario route from the routing map. */
export type ScenarioRoute = {
  domains:        string[];
  experts:        string[];
  priorityCheck:  string;
  firstQuestion:  string;
};

/** Structured knowledge context for briefing generation. */
export type KnowledgeContext = {
  /** Core coach identity (always loaded) */
  coreIdentity:      string;
  /** Matched scenario keys from routing map */
  matchedScenarios:  string[];
  /** Domains activated by scenario matching */
  activeDomains:     string[];
  /** Selected knowledge snippets (3–5) */
  snippets:          KnowledgeChunk[];
  /** Priority check guidance from matched scenarios */
  priorityChecks:    string[];
};


// ═══════════════════════════════════════════════
// COACHING FOCUS (prioritization layer)
// ═══════════════════════════════════════════════

/** Primary coaching focus areas the engine can select. */
export type CoachingFocusArea =
  | "disengagement_risk"
  | "compliance_crisis"
  | "plateau"
  | "consistency"
  | "adherence"
  | "progress_pacing"
  | "momentum"
  | "recovery"
  | "nutrition_execution"
  | "streak_protection";

/** How the coach should frame the message around this focus. */
export type CoachingFocusMode =
  | "reinforce"      // things are going well — affirm and protect
  | "correct"        // something is off — name it and redirect
  | "caution"        // warning signs — flag without alarm
  | "simplify"       // overwhelmed/stressed — reduce complexity
  | "encourage";     // rebuilding — meet them where they are

/** Output of the Focus Engine — drives briefing tone and content. */
export type CoachingFocus = {
  /** The single most important coaching priority today */
  primaryFocus:      CoachingFocusArea;
  /** How the coach should approach this focus */
  focusMode:         CoachingFocusMode;
  /** Human-readable reason for this focus selection */
  focusReason:       string;
  /** Optional secondary focus when two things truly matter */
  secondaryFocus?:   CoachingFocusArea;
  /** Signal keys that informed this decision */
  supportingSignals: string[];
};
