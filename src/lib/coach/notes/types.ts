// ─────────────────────────────────────────────
// Coach Notes — shared types
// ─────────────────────────────────────────────

export type NoteType = "observation" | "conversation" | "strategy" | "reminder";

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  observation:  "Observation",
  conversation: "Conversation",
  strategy:     "Strategy",
  reminder:     "Reminder",
};

export interface CoachNote {
  id: string;
  coachId: string;
  clientId: string | null;
  clientName: string | null;
  noteText: string;
  noteType: NoteType;
  createdAt: string;
  updatedAt: string;
}
