// ─────────────────────────────────────────────
// PrintReport — Clean, light client-facing report
//
// White background, minimal ink, professional layout.
// Optimized for browser "Save as PDF" or printing.
// Hidden on screen, visible only when printing.
// ─────────────────────────────────────────────

import type { ClientReportData } from "@/lib/coach/reports/types";

const cinzel = "'Cinzel', serif";
const garamond = "'EB Garamond', serif";

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function complianceLabel(pct: number): string {
  if (pct >= 80) return "Excellent";
  if (pct >= 70) return "Good";
  if (pct >= 50) return "Fair";
  if (pct >= 30) return "Needs Improvement";
  return "Critical";
}

interface Props {
  report: ClientReportData;
}

export function PrintReport({ report }: Props) {
  const period = `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`;
  const weightDelta = report.weightHistory.length >= 2
    ? report.weightHistory[report.weightHistory.length - 1].weight - report.weightHistory[0].weight
    : null;

  return (
    <div className="hidden print:block" style={{ background: "#fff", color: "#111", fontFamily: garamond, fontSize: "12px", lineHeight: 1.6 }}>

      {/* ═══ PAGE 1: Summary ═══════════════════════════════════════ */}
      <div style={{ padding: "40px 48px", maxWidth: "720px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #B8933A", paddingBottom: "14px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontFamily: cinzel, fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8933A", textTransform: "uppercase", marginBottom: "4px" }}>
                PulseOS Progress Report
              </p>
              <h1 style={{ fontFamily: cinzel, fontSize: "22px", fontWeight: 700, color: "#111", margin: 0, letterSpacing: "0.02em" }}>
                {report.clientName}
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>{period}</p>
              <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>Coach: {report.coachName}</p>
            </div>
          </div>
        </div>

        {/* Status headline */}
        <div style={{ background: "#f8f7f4", border: "1px solid #e8e4dd", borderRadius: "6px", padding: "14px 18px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span style={{ fontFamily: cinzel, fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B8933A" }}>
              Status: {report.statusLabel.replace("_", " ")}
            </span>
          </div>
          <p style={{ fontSize: "13px", fontStyle: "italic", color: "#444", margin: 0 }}>
            {report.statusHeadline}
          </p>
        </div>

        {/* Goal */}
        {report.goalName && (
          <div style={{ marginBottom: "24px" }}>
            <SectionTitle>Goal</SectionTitle>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#222", margin: "4px 0 8px" }}>
              {report.goalName}
              {report.goalCategory && <span style={{ fontSize: "11px", color: "#888", marginLeft: "8px" }}>({report.goalCategory})</span>}
            </p>

            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ flex: 1, height: "8px", background: "#e8e4dd", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(report.goalProgress, 100)}%`, height: "100%", background: "#B8933A", borderRadius: "4px" }} />
              </div>
              <span style={{ fontFamily: cinzel, fontSize: "12px", fontWeight: 700, color: "#222" }}>
                {report.goalProgress}%
              </span>
            </div>

            {/* Metric cards */}
            {report.goalMetrics.length > 0 && (
              <div style={{ display: "flex", gap: "12px" }}>
                {report.goalMetrics.map((m) => (
                  <div key={m.label} style={{ flex: 1 }}>
                    <p style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: "4px" }}>
                      {m.label}
                    </p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <PrintMetric label="Start" value={m.start} unit={m.unit} />
                      <PrintMetric label="Current" value={m.current} unit={m.unit} bold />
                      <PrintMetric label="Target" value={m.target} unit={m.unit} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Key Metrics Strip */}
        <div style={{ marginBottom: "24px" }}>
          <SectionTitle>Key Metrics</SectionTitle>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <KeyMetricBox label="30-Day Compliance" value={`${report.thirtyDayPct}%`} sub={complianceLabel(report.thirtyDayPct)} />
            <KeyMetricBox label="7-Day Compliance" value={`${report.sevenDayPct}%`} sub={report.sevenDayPct > report.thirtyDayPct ? "↑ Trending up" : report.sevenDayPct < report.thirtyDayPct ? "↓ Trending down" : "→ Stable"} />
            {report.currentWeight !== null && (
              <KeyMetricBox
                label="Current Weight"
                value={`${report.currentWeight} lbs`}
                sub={weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} lbs this period` : undefined}
              />
            )}
            {report.currentBodyFat !== null && (
              <KeyMetricBox label="Body Fat" value={`${report.currentBodyFat}%`} />
            )}
            {report.currentSmm !== null && (
              <KeyMetricBox label="SMM" value={`${report.currentSmm} lbs`} />
            )}
          </div>
        </div>

        {/* Weight chart (simplified for print) */}
        {report.weightHistory.length >= 2 && (
          <div style={{ marginBottom: "24px" }}>
            <SectionTitle>Weight Trend</SectionTitle>
            <PrintWeightChart data={report.weightHistory} />
          </div>
        )}

        {/* Pillar Breakdown */}
        <div style={{ marginBottom: "24px" }}>
          <SectionTitle>Pillar Breakdown</SectionTitle>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            {report.pillars.map((p) => {
              const hasData = p.avgPct !== null && p.taskCount > 0;
              return (
                <div key={p.label} style={{ flex: 1, border: "1px solid #e8e4dd", borderRadius: "4px", padding: "8px 4px", textAlign: "center" }}>
                  <p style={{ fontFamily: cinzel, fontSize: "16px", fontWeight: 700, color: hasData ? "#222" : "#ccc", margin: 0 }}>
                    {hasData ? `${p.avgPct}%` : "—"}
                  </p>
                  <p style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", margin: "2px 0 0" }}>
                    {p.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ═══ PAGE 2: Details ═══════════════════════════════════════ */}
      <div style={{ pageBreakBefore: "always", padding: "40px 48px", maxWidth: "720px", margin: "0 auto" }}>

        {/* Wins */}
        {report.wins.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <SectionTitle>Wins This Period</SectionTitle>
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
              {report.wins.map((w, i) => (
                <li key={i} style={{ fontSize: "12px", color: "#333", marginBottom: "4px" }}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Focus Areas */}
        {report.focusAreas.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <SectionTitle>Focus Areas</SectionTitle>
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
              {report.focusAreas.map((a, i) => (
                <li key={i} style={{ fontSize: "12px", color: "#333", marginBottom: "4px" }}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Coaching Signals */}
        <div style={{ marginBottom: "24px" }}>
          <SectionTitle>Coaching Signals</SectionTitle>
          <div style={{ marginTop: "8px" }}>
            {report.signals.map((sig, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sig.dot === "green" ? "#2a7d5f" : sig.dot === "gold" ? "#B8933A" : "#a33", flexShrink: 0, marginTop: "5px" }} />
                <p style={{ fontSize: "12px", color: "#333", margin: 0 }}>{sig.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coach Notes placeholder */}
        <div style={{ marginBottom: "24px" }}>
          <SectionTitle>Coach Notes</SectionTitle>
          <div style={{ border: "1px solid #e8e4dd", borderRadius: "4px", minHeight: "80px", padding: "10px 12px", marginTop: "8px" }}>
            <p style={{ fontSize: "11px", color: "#aaa", fontStyle: "italic", margin: 0 }}>
              Space for coach observations and next steps.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e8e4dd", paddingTop: "12px", marginTop: "32px", textAlign: "center" }}>
          <p style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#B8933A", textTransform: "uppercase" }}>
            Generated by PulseOS · {fmtDate(new Date().toISOString().slice(0, 10))}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: cinzel, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B8933A", margin: 0, borderBottom: "1px solid #e8e4dd", paddingBottom: "4px" }}>
      {children}
    </p>
  );
}

function PrintMetric({ label, value, unit, bold }: { label: string; value: number | null; unit: string; bold?: boolean }) {
  return (
    <div style={{ flex: 1, border: "1px solid #e8e4dd", borderRadius: "3px", padding: "4px 6px", textAlign: "center" }}>
      <p style={{ fontFamily: cinzel, fontSize: "11px", fontWeight: bold ? 700 : 400, color: bold ? "#222" : "#666", margin: 0 }}>
        {value != null ? `${value}${unit}` : "—"}
      </p>
      <p style={{ fontFamily: cinzel, fontSize: "5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa", margin: 0 }}>
        {label}
      </p>
    </div>
  );
}

function KeyMetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ flex: 1, border: "1px solid #e8e4dd", borderRadius: "4px", padding: "8px 10px", textAlign: "center" }}>
      <p style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999", margin: "0 0 4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: cinzel, fontSize: "16px", fontWeight: 700, color: "#222", margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: "10px", color: "#888", fontStyle: "italic", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

function PrintWeightChart({ data }: { data: { date: string; weight: number }[] }) {
  if (data.length < 2) return null;

  const W = 600, H = 100;
  const PAD = { top: 10, right: 10, bottom: 20, left: 40 };
  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - ((d.weight - minW) / range) * chartH,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ marginTop: "8px" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {/* Grid */}
        <line x1={PAD.left} y1={PAD.top} x2={W - PAD.right} y2={PAD.top} stroke="#e8e4dd" strokeWidth={0.5} />
        <line x1={PAD.left} y1={PAD.top + chartH / 2} x2={W - PAD.right} y2={PAD.top + chartH / 2} stroke="#e8e4dd" strokeWidth={0.5} />
        <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH} stroke="#e8e4dd" strokeWidth={0.5} />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#B8933A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill="#B8933A" />
        ))}

        {/* Y labels */}
        <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" style={{ fontFamily: cinzel, fontSize: "7px", fill: "#888" }}>
          {Math.round(maxW)}
        </text>
        <text x={PAD.left - 4} y={PAD.top + chartH + 4} textAnchor="end" style={{ fontFamily: cinzel, fontSize: "7px", fill: "#888" }}>
          {Math.round(minW)}
        </text>

        {/* X labels */}
        <text x={PAD.left} y={H - 2} textAnchor="start" style={{ fontFamily: cinzel, fontSize: "6px", fill: "#888" }}>
          {new Date(data[0].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </text>
        <text x={W - PAD.right} y={H - 2} textAnchor="end" style={{ fontFamily: cinzel, fontSize: "6px", fill: "#888" }}>
          {new Date(data[data.length - 1].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </text>
      </svg>
    </div>
  );
}
