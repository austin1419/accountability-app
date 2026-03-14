"use client";

import { BottomNav }     from "@/components/BottomNav";
import { DateHeader }    from "@/components/DateHeader";
import { EditingBanner } from "@/components/EditingBanner";
import { useTasks }      from "@/context/TasksContext";
import { useDate }       from "@/context/DateContext";
import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";

// Map raw DB categories to PULSE pillar labels for the pill badges
const CATEGORY_LABELS: Record<string, string> = {
  Activity:         "Labor",
  Nutrition:        "Nourish",
  "Sleep/Recovery": "Sabbath",
  Supplements:      "Tend",
};

// Section label shared style
const sectionLabel: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.2em",
  color: "#4A3F2A",
  textTransform: "uppercase",
  marginBottom: 8,
};

// Card shared style
const card: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #252525",
  borderRadius: 10,
};

const divider: React.CSSProperties = {
  height: 1,
  background: "#1A1A1A",
  margin: "16px 0",
};

export default function TasksPage() {
  const { tasks, toggleTask, completedCount, totalCount, compliancePercent, streak } = useTasks();
  const { selectedDate, isViewingPast, isEditable } = useDate();
  const canEdit = isEditable(selectedDate);

  // Progress ring math
  const circumference = 2 * Math.PI * 26; // r=26 → ~163.4
  const dashOffset = circumference * (1 - compliancePercent / 100);

  // Date display
  const dateObj = new Date(selectedDate + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Short date for journal header (e.g. "SAT, Mar 14")
  const shortDay = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const shortDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Week dots: compute Sun–Sat for the week containing selectedDate
  const dayOfWeek = dateObj.getDay(); // 0=Sun
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() - dayOfWeek + i);
    const ds = d.toISOString().slice(0, 10);
    const isToday = ds === selectedDate;
    // A day is "done" if it's the selected date and all tasks are complete,
    // or for simplicity we only highlight the current selected date's state
    const isDone = isToday && completedCount > 0 && completedCount === totalCount;
    return { ds, isToday, isDone };
  });

  // Day abbreviations for journal strip
  const dayAbbrs = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header style={{ padding: "40px 20px 16px" }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.2em",
          color: "#F4EEE4",
          textTransform: "uppercase",
          margin: 0,
        }}>
          {isViewingPast ? "Past Reckoning" : "Today\u2019s Reckoning"}
        </h1>
        <p style={{
          fontFamily: "'EB Garamond', serif",
          fontStyle: "italic",
          fontSize: 13,
          color: "#807868",
          marginTop: 4,
        }}>
          {dateLabel}
        </p>
      </header>

      {/* Compact date slider */}
      <DateHeader variant="compact" />
      <EditingBanner />

      {/* ── Scrollable content ───────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── COMPLIANCE SECTION ── */}
        <p style={sectionLabel}>Today&apos;s Compliance</p>
        <div style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left side */}
          <div>
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: 28,
              color: compliancePercent >= COMPLIANCE_TARGET ? "#B8933A" : "#7A1E1E",
              lineHeight: 1,
              margin: 0,
            }}>
              {compliancePercent}%
            </p>
            <p style={{
              fontFamily: "'EB Garamond', serif",
              fontSize: 13,
              color: "#807868",
              marginTop: 6,
            }}>
              {completedCount} of {totalCount} tasks complete
            </p>
            <p style={{
              fontFamily: "'EB Garamond', serif",
              fontSize: 12,
              color: "#4A3F2A",
              marginTop: 2,
            }}>
              Target: 70% or better
            </p>
          </div>
          {/* Right side — progress ring */}
          <svg width={64} height={64} viewBox="0 0 64 64">
            <circle cx={32} cy={32} r={26} stroke="#252525" strokeWidth={6} fill="none" />
            <circle
              cx={32} cy={32} r={26}
              stroke={compliancePercent >= COMPLIANCE_TARGET ? "#B8933A" : "#7A1E1E"}
              strokeWidth={6}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
        </div>

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── TASKS SECTION ── */}
        <p style={sectionLabel}>Tasks</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((task) => {
            const pillLabel = CATEGORY_LABELS[task.category] ?? task.category;
            return (
              <div
                key={task.id}
                style={{
                  ...card,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: canEdit ? "pointer" : "default",
                }}
                onClick={() => canEdit && toggleTask(task.id)}
              >
                {/* Left — checkbox + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  {/* Checkbox */}
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    border: task.done ? "1.5px solid #B8933A" : "1.5px solid #2A2A1A",
                    background: task.done ? "rgba(184,147,58,0.12)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {task.done && (
                      <svg viewBox="0 0 16 16" width={12} height={12} fill="none">
                        <path d="M3 8l3.5 3.5L13 5" stroke="#B8933A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {/* Task name */}
                  <span style={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: 15,
                    color: task.done ? "#4A3F2A" : "#DDD5C0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {task.label}
                  </span>
                </div>
                {/* Right — category pill */}
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  color: "#4A3F2A",
                  textTransform: "uppercase",
                  background: "#1A1A1A",
                  border: "1px solid #252525",
                  borderRadius: 3,
                  padding: "2px 7px",
                  flexShrink: 0,
                  marginLeft: 8,
                }}>
                  {pillLabel}
                </span>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div style={{ ...card, padding: 16, textAlign: "center" }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#807868", fontStyle: "italic", margin: 0 }}>
                Begin your habits to start your streak.
              </p>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── STREAK SECTION ── */}
        <p style={sectionLabel}>Current Streak</p>
        <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left side */}
          <div>
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "#807868",
              textTransform: "uppercase",
              margin: 0,
            }}>
              Consecutive Days
            </p>
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: 28,
              color: "#B8933A",
              lineHeight: 1,
              margin: "6px 0 4px",
            }}>
              {streak}
            </p>
            <p style={{
              fontFamily: "'EB Garamond', serif",
              fontStyle: "italic",
              fontSize: 12,
              color: "#4A3F2A",
              margin: 0,
            }}>
              {streak > 0
                ? "Keep going. Don\u2019t break it."
                : "The streak is gone. The character it built is not. Start again."}
            </p>
          </div>
          {/* Right side — 7-dot week strip */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {weekDots.map((dot, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: dot.isDone
                      ? "#B8933A"
                      : dot.isToday
                      ? "rgba(184,147,58,0.3)"
                      : "rgba(184,147,58,0.15)",
                    border: dot.isDone || dot.isToday
                      ? "1px solid #B8933A"
                      : "1px solid #3A3020",
                  }}
                />
              ))}
            </div>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 7,
              letterSpacing: "0.2em",
              color: "#4A3F2A",
              textTransform: "uppercase",
            }}>
              This Week
            </span>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={divider} />

        {/* ── DAILY JOURNAL PLACEHOLDER ── */}
        <p style={sectionLabel}>Daily Journal</p>
        <div style={{ ...card, padding: 16 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#F4EEE4",
              textTransform: "uppercase",
            }}>
              Today&apos;s Check-In
            </span>
            <span style={{
              fontFamily: "'EB Garamond', serif",
              fontSize: 12,
              color: "#807868",
            }}>
              {shortDay}, {shortDate}
            </span>
          </div>

          {/* Day strip */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            {dayAbbrs.map((abbr, i) => {
              const dot = weekDots[i];
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 7,
                    color: "#4A3F2A",
                  }}>
                    {abbr}
                  </span>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: dot.isDone
                      ? "1.5px solid #B8933A"
                      : dot.isToday
                      ? "1.5px solid #B8933A"
                      : "1px solid #252525",
                    background: dot.isDone
                      ? "rgba(184,147,58,0.1)"
                      : dot.isToday
                      ? "transparent"
                      : "#111111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {dot.isDone && (
                      <svg viewBox="0 0 16 16" width={10} height={10} fill="none">
                        <path d="M3 8l3.5 3.5L13 5" stroke="#B8933A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {dot.isToday && !dot.isDone && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8933A", opacity: 0.4 }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA button */}
          <button
            onClick={() => console.log("Journal coming soon")}
            style={{
              width: "100%",
              background: "rgba(184,147,58,0.05)",
              border: "1px solid #3A3020",
              borderRadius: 8,
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" width={14} height={14}>
              <path
                d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="#B8933A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "#B8933A",
              textTransform: "uppercase",
            }}>
              Fill in Today&apos;s Journal
            </span>
          </button>
        </div>

      </main>

      {/* ── Bottom nav ─────────────────── */}
      <BottomNav />
    </div>
  );
}
