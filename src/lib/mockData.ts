// ─────────────────────────────────────────────
// MOCK DATA — replaces a real database for now
// All pages import from here so the data stays consistent.
// ─────────────────────────────────────────────

// ── Types ─────────────────────────────────────
// A "type" in TypeScript is just a description of what shape a piece of data has.

export type Task = {
  id: string;
  label: string;
  category: string;
  done: boolean;
};

export type WeightEntry = {
  week: string;      // e.g. "Jan 6"
  weight: number;    // in lbs
  logged_at: string; // "YYYY-MM-DD" raw date for filtering
};

// ── Client profile ────────────────────────────
export const mockClient = {
  name: "Alex",
  goal: "Lose 50 lbs by December 31, 2026",
  startWeight: 240,
  currentWeight: 218,
  goalWeight: 190,
};

// ── Today's assigned tasks ─────────────────────
export const mockTasks: Task[] = [
  { id: "1", label: "Morning walk — 30 min", category: "Movement",    done: true  },
  { id: "2", label: "Drink 100 oz of water",  category: "Nutrition",   done: true  },
  { id: "3", label: "Take daily supplements", category: "Supplements", done: false },
  { id: "4", label: "No eating after 8pm",    category: "Nutrition",   done: false },
];

// ── Weekly weight log (most recent first on the chart) ───
export const mockWeightLog: WeightEntry[] = [
  { week: "Jan 6",  weight: 240, logged_at: "2026-01-06" },
  { week: "Jan 13", weight: 237, logged_at: "2026-01-13" },
  { week: "Jan 20", weight: 235, logged_at: "2026-01-20" },
  { week: "Jan 27", weight: 233, logged_at: "2026-01-27" },
  { week: "Feb 3",  weight: 229, logged_at: "2026-02-03" },
  { week: "Feb 10", weight: 226, logged_at: "2026-02-10" },
  { week: "Feb 17", weight: 222, logged_at: "2026-02-17" },
  { week: "Feb 24", weight: 218, logged_at: "2026-02-24" },
];

// ── Category color map ────────────────────────
// Used to give each habit category a distinct color badge.
export const categoryColors: Record<string, string> = {
  Movement:        "bg-blue-100 text-blue-600",
  Activity:        "bg-blue-100 text-blue-600",
  Nutrition:       "bg-green-100 text-green-600",
  Supplements:     "bg-amber-100 text-amber-600",
  Sleep:           "bg-purple-100 text-purple-600",
  "Sleep/Recovery": "bg-purple-100 text-purple-600",
  Recovery:        "bg-teal-100 text-teal-600",
};
