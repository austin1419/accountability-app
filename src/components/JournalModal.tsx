"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { fetchJournal, upsertJournal } from "@/lib/queries";
import type { DailyJournalRow } from "@/lib/queries";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
};

// Signal field keys (booleans + numeric + scales)
type SignalPatch = Partial<Omit<DailyJournalRow, "id" | "user_id" | "date" | "created_at" | "updated_at">>;

// ── Shared styles ──────────────────────────────
const sectionHeader: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "#B8933A",
  textTransform: "uppercase",
  marginBottom: 10,
  marginTop: 20,
};

const questionRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid #1A1A1A",
};

const questionLabel: React.CSSProperties = {
  fontFamily: "'EB Garamond', serif",
  fontSize: 15,
  color: "#DDD5C0",
};

export function JournalModal({ isOpen, onClose, date }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [entry, setEntry] = useState<DailyJournalRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<SignalPatch>({});

  // Resolve userId on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (profile) setUserId(profile.id);
    }
    init();
  }, []);

  // Fetch journal entry when modal opens
  useEffect(() => {
    if (!isOpen || !userId) return;
    setSaveStatus("idle");
    setSaveError(null);
    setLoading(true);
    fetchJournal(userId, date)
      .then((data) => { setEntry(data); })
      .finally(() => setLoading(false));
  }, [isOpen, userId, date]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Flush any pending debounced save immediately
  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const merged = { ...pendingPatch.current };
    pendingPatch.current = {};
    if (!userId || Object.keys(merged).length === 0) return;
    const result = await upsertJournal(userId, date, merged);
    if (result.error) {
      setSaveStatus("error");
      setSaveError(result.error);
    } else {
      setSaveStatus("saved");
      setSaveError(null);
    }
  }, [userId, date]);

  // Debounced auto-save — accumulates patches so rapid changes are merged
  const save = useCallback((patch: SignalPatch) => {
    if (!userId) return;
    // Optimistic local update
    setEntry((prev) => {
      const base = prev ?? {
        id: "", user_id: userId, date,
        sleep_hours: null, felt_rested: null, protein_hit: null,
        hydration_hit: null, alcohol: null, trained_today: null,
        zone2_cardio: null, recovery_work: null, supplements_taken: null,
        stress_level: null, energy_level: null, notes: null,
        created_at: "", updated_at: "",
      };
      return { ...base, ...patch } as DailyJournalRow;
    });
    // Accumulate into pending patch (merges with any unsaved fields)
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    // Debounce the DB write
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const merged = { ...pendingPatch.current };
      pendingPatch.current = {};
      const result = await upsertJournal(userId, date, merged);
      if (result.error) {
        setSaveStatus("error");
        setSaveError(result.error);
      } else {
        setSaveStatus("saved");
        setSaveError(null);
      }
    }, 300);
  }, [userId, date]);

  // Date label for header
  const dateObj = new Date(date + "T12:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  // Flush pending save before closing
  const handleClose = useCallback(async () => {
    await flush();
    onClose();
  }, [flush, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0D0D0D",
          border: "1px solid #2A2A1A",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 480,
          height: "88dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #252525",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <span style={{
              fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.18em", color: "#F4EEE4", textTransform: "uppercase",
            }}>
              Journal
            </span>
            <span style={{
              fontFamily: "'EB Garamond', serif", fontSize: 13,
              color: "#807868", marginLeft: 12,
            }}>
              {dateLabel}
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 30, height: 30, borderRadius: "50%",
              border: "1px solid #2A2A1A", background: "none",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#807868", fontSize: 16,
              fontFamily: "sans-serif", lineHeight: 1,
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "0 20px 32px",
          WebkitOverflowScrolling: "touch",
        }}>
          {loading ? (
            <p style={{
              fontFamily: "'EB Garamond', serif", fontSize: 14,
              color: "#807868", fontStyle: "italic", textAlign: "center", marginTop: 40,
            }}>
              Loading...
            </p>
          ) : (
            <>
              {/* Instruction */}
              <p style={{
                fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                fontSize: 13, color: "#807868", textAlign: "center",
                margin: "16px 0 4px",
              }}>
                Best filled out in the evening after your day is complete.
              </p>

              {/* ── SABBATH ── */}
              <p style={sectionHeader}>Sabbath &mdash; Recovery</p>

              {/* Sleep hours */}
              <div style={questionRow}>
                <span style={questionLabel}>Sleep hours</span>
                <SleepStepper
                  value={entry?.sleep_hours ?? null}
                  onChange={(v) => save({ sleep_hours: v })}
                />
              </div>

              <BooleanToggle
                label="Felt rested"
                value={entry?.felt_rested ?? null}
                onChange={(v) => save({ felt_rested: v })}
              />

              {/* ── NOURISH ── */}
              <p style={sectionHeader}>Nourish &mdash; Nutrition</p>

              <BooleanToggle
                label="Protein target hit"
                value={entry?.protein_hit ?? null}
                onChange={(v) => save({ protein_hit: v })}
              />
              <BooleanToggle
                label="Hydrated adequately"
                value={entry?.hydration_hit ?? null}
                onChange={(v) => save({ hydration_hit: v })}
              />
              <BooleanToggle
                label="Alcohol consumed"
                value={entry?.alcohol ?? null}
                onChange={(v) => save({ alcohol: v })}
              />

              {/* ── LABOR ── */}
              <p style={sectionHeader}>Labor &mdash; Training</p>

              <BooleanToggle
                label="Trained today"
                value={entry?.trained_today ?? null}
                onChange={(v) => save({ trained_today: v })}
              />
              <BooleanToggle
                label="Zone 2 cardio"
                value={entry?.zone2_cardio ?? null}
                onChange={(v) => save({ zone2_cardio: v })}
              />
              <BooleanToggle
                label="Recovery work"
                value={entry?.recovery_work ?? null}
                onChange={(v) => save({ recovery_work: v })}
              />

              {/* ── TEND ── */}
              <p style={sectionHeader}>Tend &mdash; Supplements</p>

              <BooleanToggle
                label="Supplements taken"
                value={entry?.supplements_taken ?? null}
                onChange={(v) => save({ supplements_taken: v })}
              />

              {/* ── MINDSET ── */}
              <p style={sectionHeader}>Mindset</p>

              <ScaleSelector
                label="Stress level"
                value={entry?.stress_level ?? null}
                onChange={(v) => save({ stress_level: v })}
              />
              <ScaleSelector
                label="Energy level"
                value={entry?.energy_level ?? null}
                onChange={(v) => save({ energy_level: v })}
              />

              {/* ── NOTES ── */}
              <p style={sectionHeader}>Notes</p>

              <textarea
                value={entry?.notes ?? ""}
                onChange={(e) => save({ notes: e.target.value || null })}
                maxLength={500}
                placeholder="Anything else on your mind..."
                rows={3}
                style={{
                  width: "100%",
                  background: "#141414",
                  border: "1px solid #252525",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontFamily: "'EB Garamond', serif",
                  color: "#F4EEE4",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <p style={{
                fontFamily: "'EB Garamond', serif", fontSize: 11,
                color: "#4A3F2A", marginTop: 4, textAlign: "right",
              }}>
                {(entry?.notes ?? "").length}/500
              </p>

              {/* Autosave indicator */}
              {saveStatus !== "idle" && (
                <p style={{
                  fontFamily: "'EB Garamond', serif", fontSize: 12,
                  color: saveStatus === "error" ? "#7A1E1E" : saveStatus === "saved" ? "#4A3F2A" : "#807868",
                  textAlign: "center", marginTop: 20,
                  transition: "color 0.3s ease",
                }}>
                  {saveStatus === "saving" && "Saving..."}
                  {saveStatus === "saved" && "\u2713 All changes saved"}
                  {saveStatus === "error" && (saveError ?? "Save failed")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ── BooleanToggle ─────────────────────────────
function BooleanToggle({
  label, value, onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={questionRow}>
      <span style={questionLabel}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <TogglePill
          text="Yes"
          active={value === true}
          onClick={() => onChange(true)}
        />
        <TogglePill
          text="No"
          active={value === false}
          onClick={() => onChange(false)}
        />
      </div>
    </div>
  );
}

function TogglePill({
  text, active, onClick,
}: {
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "5px 14px",
        borderRadius: 16,
        border: active ? "1.5px solid #B8933A" : "1px solid #2A2A1A",
        background: active ? "rgba(184,147,58,0.12)" : "transparent",
        color: active ? "#B8933A" : "#807868",
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );
}


// ── SleepStepper ──────────────────────────────
function SleepStepper({
  value, onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const current = value ?? 0;
  const decrement = () => { if (current > 0) onChange(Math.round((current - 0.5) * 2) / 2); };
  const increment = () => { if (current < 12) onChange(Math.round((current + 0.5) * 2) / 2); };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <StepperButton text="-" onClick={decrement} disabled={current <= 0} />
      <span style={{
        fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 18,
        color: "#F4EEE4", minWidth: 36, textAlign: "center",
      }}>
        {value != null ? current.toFixed(1) : "—"}
      </span>
      <StepperButton text="+" onClick={increment} disabled={current >= 12} />
    </div>
  );
}

function StepperButton({
  text, onClick, disabled,
}: {
  text: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28, height: 28, borderRadius: "50%",
        border: "1px solid #2A2A1A",
        background: disabled ? "transparent" : "rgba(184,147,58,0.08)",
        color: disabled ? "#2A2A1A" : "#B8933A",
        fontSize: 16, fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "sans-serif", lineHeight: 1,
      }}
    >
      {text}
    </button>
  );
}


// ── ScaleSelector ─────────────────────────────
function ScaleSelector({
  label, value, onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ ...questionRow, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <span style={questionLabel}>{label}</span>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value != null && n === value;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 6,
                border: selected ? "1.5px solid #B8933A" : "1px solid #2A2A1A",
                background: selected ? "rgba(184,147,58,0.12)" : "transparent",
                color: selected ? "#B8933A" : "#807868",
                fontFamily: "'Cinzel', serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: "'EB Garamond', serif", fontSize: 10,
        color: "#4A3F2A", fontStyle: "italic",
      }}>
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
