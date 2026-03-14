// ─────────────────────────────────────────────
// Coaching Profile — shared types
// ─────────────────────────────────────────────

export type InputType =
  | "text"
  | "textarea"
  | "number"
  | "single_select"
  | "multi_select"
  | "scale";

export type Question = {
  questionKey: string;
  label:       string;
  inputType:   InputType;
  options?:    string[];
  helperText?: string;
  scaleMin?:   number;
  scaleMax?:   number;
  required:    boolean;
};

export type SectionConfig = {
  sectionKey: string;
  title:      string;
  questions:  Question[];
};

export type TileStatus = "not_started" | "in_progress" | "complete";

export type SavedAnswers = Record<string, unknown>;
