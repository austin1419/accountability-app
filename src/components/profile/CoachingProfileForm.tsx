"use client";

// ─────────────────────────────────────────────
// CoachingProfileForm — dynamic form renderer
//
// Reads question config for a section, renders fields,
// loads saved answers on mount, and saves on submit.
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { SectionConfig, SavedAnswers } from "@/lib/coachingProfile/types";
import { fetchCoachingAnswers, upsertCoachingAnswers } from "@/lib/coachingProfile/queries";
import { TextField }       from "./fields/TextField";
import { NumberField }      from "./fields/NumberField";
import { SelectField }      from "./fields/SelectField";
import { MultiSelectField } from "./fields/MultiSelectField";
import { ScaleField }       from "./fields/ScaleField";

interface Props {
  userId:  string;
  config:  SectionConfig;
  onClose: () => void;
  onSaved: () => void;
}

export function CoachingProfileForm({ userId, config, onClose, onSaved }: Props) {
  const [answers, setAnswers] = useState<SavedAnswers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Load saved answers on mount
  useEffect(() => {
    fetchCoachingAnswers(userId, config.sectionKey).then((saved) => {
      setAnswers(saved);
      setLoading(false);
    });
  }, [userId, config.sectionKey]);

  const update = useCallback((key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await upsertCoachingAnswers(userId, config.sectionKey, answers);
    setSaving(false);
    onSaved();
    onClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[#807868]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {config.questions.map((q) => {
        const key = q.questionKey;

        switch (q.inputType) {
          case "text":
            return (
              <TextField
                key={key}
                label={q.label}
                value={(answers[key] as string) ?? ""}
                onChange={(v) => update(key, v)}
                helperText={q.helperText}
              />
            );

          case "textarea":
            return (
              <TextField
                key={key}
                label={q.label}
                value={(answers[key] as string) ?? ""}
                onChange={(v) => update(key, v)}
                multiline
                helperText={q.helperText}
              />
            );

          case "number":
            return (
              <NumberField
                key={key}
                label={q.label}
                value={(answers[key] as number) ?? ""}
                onChange={(v) => update(key, v)}
                helperText={q.helperText}
              />
            );

          case "single_select":
            return (
              <SelectField
                key={key}
                label={q.label}
                value={(answers[key] as string) ?? ""}
                onChange={(v) => update(key, v)}
                options={q.options ?? []}
                helperText={q.helperText}
              />
            );

          case "multi_select":
            return (
              <MultiSelectField
                key={key}
                label={q.label}
                value={(answers[key] as string[]) ?? []}
                onChange={(v) => update(key, v)}
                options={q.options ?? []}
                helperText={q.helperText}
              />
            );

          case "scale":
            return (
              <ScaleField
                key={key}
                label={q.label}
                value={(answers[key] as number) ?? ""}
                onChange={(v) => update(key, v)}
                min={q.scaleMin ?? 1}
                max={q.scaleMax ?? 10}
                helperText={q.helperText}
              />
            );

          default:
            return null;
        }
      })}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded bg-[#252525] text-sm text-[#DDD5C0] hover:bg-[#2A2A2A] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded bg-[#B8933A] text-sm font-semibold text-[#111] hover:bg-[#C9A44B] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
