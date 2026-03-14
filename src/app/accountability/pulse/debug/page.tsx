// ─────────────────────────────────────────────
// PULSE Debug — internal inspection tool
//
// Shows the full AI pipeline output for the current
// user: context snapshot, signals, focus, knowledge,
// and the generated system prompt.
//
// For development only. Not linked in navigation.
// ─────────────────────────────────────────────

import { redirect }                     from "next/navigation";
import { createServerSupabaseClient }   from "@/lib/supabase-server";
import { createAdminClient }            from "@/lib/supabase-admin";
import { buildClientContext }           from "@/lib/ai/buildClientContext";
import { analyzeClientContext }         from "@/lib/ai/analyzeClientContext";
import { buildCoachSummary }            from "@/lib/ai/buildCoachSummary";
import { buildKnowledgeContext }        from "@/lib/ai/knowledgeRetrieval";
import { determineCoachingFocus }       from "@/lib/ai/determineCoachingFocus";
import { fetchRelevantMemories }        from "@/lib/ai/aiMemory";
import { buildChatSystemPrompt }        from "@/lib/ai/buildChatSystemPrompt";
import { generateRuleBasedCoachResponse } from "@/lib/coach/generateRuleBasedCoachResponse";
import { readFile }                     from "fs/promises";
import { join }                         from "path";

const PULSE_AI_ENABLED = process.env.PULSE_AI_ENABLED === "true";
const DEV_ALL_USERS = process.env.PULSE_AI_DEV_ALL_USERS === "true";

export const dynamic = "force-dynamic";

export default async function PulseDebugPage() {
  // ── Auth ────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("id, role, ai_access_enabled")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // ── Date ────────────────────────────────────
  const selectedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  // ── Run full pipeline ───────────────────────
  const [ctx, memories, coreIdentity] = await Promise.all([
    buildClientContext(profile.id, selectedDate),
    fetchRelevantMemories(profile.id),
    readFile(join(process.cwd(), "knowledge", "core_identity.md"), "utf-8"),
  ]);

  const analysis     = analyzeClientContext(ctx);
  const coachSummary = buildCoachSummary(ctx, analysis);
  const knowledge    = await buildKnowledgeContext(ctx, analysis, coachSummary);
  const focus        = determineCoachingFocus(ctx, analysis, memories, knowledge);

  const systemPrompt = buildChatSystemPrompt({
    ctx,
    analysis,
    coachSummary,
    focus,
    knowledge,
    memories,
    coreIdentity,
  });

  // Generate sample rule-based responses for inspection
  const sampleQuestions = [
    "How am I doing?",
    "Why has my weight stalled?",
    "What should I do today?",
  ];
  const sampleResponses = sampleQuestions.map((q) => ({
    question: q,
    response: generateRuleBasedCoachResponse({
      ctx, analysis, focus, knowledge, userMessage: q,
    }),
  }));

  // ── Styles ──────────────────────────────────
  const mono = "'SF Mono', 'Fira Code', monospace";

  const sectionStyle: React.CSSProperties = {
    background: "#111111",
    border: "1px solid #252525",
    borderRadius: 8,
    padding: "16px 20px",
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Cinzel', serif",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "#B8933A",
    textTransform: "uppercase",
    marginBottom: 8,
    display: "block",
  };

  const preStyle: React.CSSProperties = {
    fontFamily: mono,
    fontSize: 11,
    color: "#B8B0A0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    margin: 0,
    lineHeight: 1.5,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: "'EB Garamond', serif",
    fontSize: 14,
    color: "#F4EEE4",
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    fontFamily: "'Cinzel', serif",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color,
    background: `${color}15`,
    border: `1px solid ${color}40`,
    borderRadius: 3,
    padding: "2px 8px",
    display: "inline-block",
    marginRight: 6,
  });

  const riskColor = analysis.riskLevel === "critical" || analysis.riskLevel === "high"
    ? "#7A1E1E"
    : analysis.riskLevel === "moderate" ? "#B8933A" : "#807868";

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0D0D0D",
      maxWidth: 600,
      margin: "0 auto",
      padding: "20px 20px 40px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "#B8933A",
          textTransform: "uppercase",
        }}>
          PULSE Debug Inspector
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <span style={badgeStyle(PULSE_AI_ENABLED ? "#B8933A" : "#807868")}>
            AI_SYSTEM: {PULSE_AI_ENABLED ? "ENABLED" : "DISABLED"}
          </span>
          <span style={badgeStyle(profile.ai_access_enabled || DEV_ALL_USERS ? "#B8933A" : "#807868")}>
            USER_AI_ACCESS: {DEV_ALL_USERS ? "DEV_OVERRIDE" : profile.ai_access_enabled ? "ENABLED" : "DISABLED"}
          </span>
          <span style={badgeStyle(PULSE_AI_ENABLED && (profile.ai_access_enabled || DEV_ALL_USERS) ? "#B8933A" : "#807868")}>
            RESPONSE_MODE: {PULSE_AI_ENABLED && (profile.ai_access_enabled || DEV_ALL_USERS) ? "LLM" : "RULE_BASED"}
          </span>
        </div>
        <p style={{
          fontFamily: mono,
          fontSize: 11,
          color: "#807868",
          margin: "4px 0 0",
        }}>
          {ctx.client.name} &middot; {selectedDate} &middot; Built at {ctx.builtAt}
        </p>
      </div>

      {/* Status overview */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Status Overview</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={badgeStyle(riskColor)}>
            Risk: {analysis.riskLevel}
          </span>
          <span style={badgeStyle("#B8933A")}>
            Momentum: {analysis.momentumState}
          </span>
          <span style={badgeStyle("#807868")}>
            Status: {analysis.coachingStatus}
          </span>
          <span style={badgeStyle("#807868")}>
            Score: {analysis.statusScore.overallScore}/100
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <span style={{ ...labelStyle, fontSize: 8 }}>Streak</span>
            <span style={valueStyle}>{ctx.streak} days</span>
          </div>
          <div>
            <span style={{ ...labelStyle, fontSize: 8 }}>Week Compliance</span>
            <span style={valueStyle}>{ctx.compliance.week.percent}%</span>
          </div>
          <div>
            <span style={{ ...labelStyle, fontSize: 8 }}>Month Compliance</span>
            <span style={valueStyle}>{ctx.compliance.month.percent}%</span>
          </div>
          <div>
            <span style={{ ...labelStyle, fontSize: 8 }}>Today</span>
            <span style={valueStyle}>
              {ctx.compliance.today.completed}/{ctx.compliance.today.total} ({ctx.compliance.today.percent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Coaching Focus */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Coaching Focus</span>
        <div style={{ marginBottom: 8 }}>
          <span style={badgeStyle("#B8933A")}>{focus.primaryFocus}</span>
          <span style={badgeStyle("#807868")}>{focus.focusMode}</span>
          {focus.secondaryFocus && (
            <span style={badgeStyle("#807868")}>2nd: {focus.secondaryFocus}</span>
          )}
        </div>
        <p style={{ ...valueStyle, fontSize: 13, color: "#B8B0A0" }}>
          {focus.focusReason}
        </p>
        <p style={{ fontFamily: mono, fontSize: 10, color: "#807868", margin: "4px 0 0" }}>
          Signals: {focus.supportingSignals.join(", ") || "none"}
        </p>
      </div>

      {/* Detected Risks */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Detected Risks ({analysis.riskSignals.filter((s) => s.detected).length})</span>
        {analysis.riskSignals.filter((s) => s.detected).length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: 11, color: "#807868", margin: 0 }}>
            No active risk signals
          </p>
        ) : (
          analysis.riskSignals
            .filter((s) => s.detected)
            .map((s) => (
              <div key={s.key} style={{ marginBottom: 8 }}>
                <span style={badgeStyle(s.severity === "critical" || s.severity === "high" ? "#7A1E1E" : "#B8933A")}>
                  {s.key} [{s.severity}]
                </span>
                <p style={{ fontFamily: mono, fontSize: 10, color: "#B8B0A0", margin: "4px 0 0" }}>
                  {s.evidence.join(" | ")}
                </p>
              </div>
            ))
        )}
      </div>

      {/* Detected Patterns */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Detected Patterns ({analysis.patternSignals.filter((s) => s.detected).length})</span>
        {analysis.patternSignals.filter((s) => s.detected).length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: 11, color: "#807868", margin: 0 }}>
            No active pattern signals
          </p>
        ) : (
          analysis.patternSignals
            .filter((s) => s.detected)
            .map((s) => (
              <div key={s.key} style={{ marginBottom: 8 }}>
                <span style={badgeStyle("#807868")}>
                  {s.key} [{s.severity}/{s.direction ?? "n/a"}]
                </span>
                <p style={{ fontFamily: mono, fontSize: 10, color: "#B8B0A0", margin: "4px 0 0" }}>
                  {s.evidence.join(" | ")}
                </p>
              </div>
            ))
        )}
      </div>

      {/* Knowledge */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Knowledge Context</span>
        <p style={{ fontFamily: mono, fontSize: 10, color: "#807868", margin: "0 0 8px" }}>
          Scenarios: {knowledge.matchedScenarios.join(", ") || "none"}
        </p>
        <p style={{ fontFamily: mono, fontSize: 10, color: "#807868", margin: "0 0 8px" }}>
          Domains: {knowledge.activeDomains.join(", ") || "none"}
        </p>
        {knowledge.snippets.map((s) => (
          <div key={s.id} style={{ marginBottom: 8 }}>
            <span style={badgeStyle("#807868")}>{s.domain}/{s.topic}</span>
            <p style={{ fontFamily: mono, fontSize: 10, color: "#B8B0A0", margin: "4px 0 0" }}>
              {s.text.slice(0, 150)}...
            </p>
          </div>
        ))}
      </div>

      {/* Memories */}
      <div style={sectionStyle}>
        <span style={labelStyle}>AI Memories ({memories.length})</span>
        {memories.length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: 11, color: "#807868", margin: 0 }}>
            No memories stored
          </p>
        ) : (
          memories.map((m) => (
            <div key={m.id} style={{ marginBottom: 6 }}>
              <span style={badgeStyle("#807868")}>{m.memoryType} [imp:{m.importanceScore}]</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: "#B8B0A0", marginLeft: 4 }}>
                {m.memoryText}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Sample Rule-Based Responses */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Sample Rule-Based Responses</span>
        {sampleResponses.map((s, i) => (
          <div key={i} style={{ marginBottom: i < sampleResponses.length - 1 ? 16 : 0 }}>
            <p style={{ fontFamily: mono, fontSize: 10, color: "#B8933A", margin: "0 0 4px" }}>
              User: &ldquo;{s.question}&rdquo;
            </p>
            <pre style={{ ...preStyle, fontSize: 11, color: "#D4CFC4" }}>{s.response}</pre>
            {i < sampleResponses.length - 1 && (
              <div style={{ borderBottom: "1px solid #1E1E1E", marginTop: 12 }} />
            )}
          </div>
        ))}
      </div>

      {/* System Prompt */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Generated System Prompt ({systemPrompt.length} chars)</span>
        <pre style={preStyle}>{systemPrompt}</pre>
      </div>
    </div>
  );
}
