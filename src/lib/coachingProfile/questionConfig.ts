// ─────────────────────────────────────────────
// Coaching Profile — question configuration
//
// Each section defines its questions declaratively.
// The form renderer reads this config to build the UI.
// ─────────────────────────────────────────────

import type { SectionConfig } from "./types";

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    sectionKey: "identity_life_context",
    title: "Identity & Life Context",
    questions: [
      {
        questionKey: "age",
        label: "How old are you?",
        inputType: "number",
        required: true,
      },
      {
        questionKey: "biological_sex",
        label: "What is your biological sex?",
        inputType: "single_select",
        options: ["Male", "Female", "Prefer not to say"],
        required: false,
      },
      {
        questionKey: "life_season",
        label: "Which best describes your current life season?",
        inputType: "single_select",
        options: [
          "Student or early career",
          "Building career",
          "Raising young children",
          "Established career",
          "Empty nester or life transition",
          "Retired or semi-retired",
          "Other",
        ],
        required: false,
      },
      {
        questionKey: "workday_description",
        label: "What does your typical workday look like?",
        inputType: "multi_select",
        options: [
          "Desk or office work (mostly seated)",
          "On my feet all day",
          "High mental stress or decision-making work",
          "Variable schedule or shifts",
          "Work from home",
          "Multiple jobs or roles",
          "Retired / not currently working",
        ],
        required: false,
      },
      {
        questionKey: "health_motivation",
        label: "What made you decide to start improving your health now?",
        inputType: "textarea",
        required: false,
      },
      {
        questionKey: "prior_attempts",
        label: "Have you tried to improve your health or fitness before?",
        inputType: "single_select",
        options: [
          "Yes, multiple times",
          "Yes, once or twice",
          "This is my first serious attempt",
        ],
        required: false,
      },
      {
        questionKey: "prior_attempts_detail",
        label: "If yes, what happened previously? What worked and what caused it to fall apart?",
        inputType: "textarea",
        required: false,
      },
      {
        questionKey: "support_system",
        label: "Who in your life is supportive of your health goals?",
        inputType: "multi_select",
        options: [
          "My partner or spouse is supportive",
          "My partner knows but is not particularly supportive",
          "Close friends encourage me",
          "No one really knows yet",
          "I am doing this alone by choice",
          "Family members may make it harder",
        ],
        required: false,
      },
      {
        questionKey: "training_days",
        label: "Realistically, how many days per week can you train intentionally?",
        inputType: "single_select",
        options: [
          "2 days",
          "3 days",
          "4 days",
          "5 days",
          "More than 5 days",
        ],
        required: false,
      },
      {
        questionKey: "training_time",
        label: "What time of day usually works best for training?",
        inputType: "single_select",
        options: [
          "Early morning (before 7am)",
          "Morning (7–9am)",
          "Midday",
          "Afternoon (3–5pm)",
          "Evening (after 5pm)",
          "My schedule varies",
        ],
        required: false,
      },
      {
        questionKey: "biggest_obstacles",
        label: "What are the two biggest things most likely to get in your way?",
        inputType: "multi_select",
        options: [
          "Time and schedule chaos",
          "Low energy or fatigue",
          "Stress eating or emotional eating",
          "Staying consistent when motivation drops",
          "Injuries or physical limitations",
          "Social situations and travel",
          "All-or-nothing thinking",
          "Not sure what plan to follow",
          "Cost or access to resources",
        ],
        required: false,
      },
      {
        questionKey: "self_identity",
        label: "Finish this sentence — \"When it comes to my health and fitness, I am someone who…\"",
        inputType: "textarea",
        required: false,
      },
      {
        questionKey: "six_month_vision",
        label: "Six months from now, if this worked, what would be different in your life?",
        inputType: "textarea",
        required: false,
      },
      {
        questionKey: "accountability_style",
        label: "How do you prefer to be held accountable when things get difficult?",
        inputType: "single_select",
        options: [
          "Be direct with me and show the data",
          "Acknowledge effort first, then address problems",
          "Ask questions and let me reflect",
          "Just check in consistently",
        ],
        required: false,
      },
      {
        questionKey: "faith_integration",
        label: "Would you like faith or personal values integrated into coaching?",
        inputType: "single_select",
        options: [
          "Yes, my faith is important to my discipline",
          "Somewhat, I am open to it",
          "No, keep coaching practical",
        ],
        required: false,
      },
    ],
  },
  { sectionKey: "health_history",            title: "Health History",            questions: [] },
  { sectionKey: "training_background",       title: "Training Background",       questions: [] },
  { sectionKey: "nutrition_habits",          title: "Nutrition Habits",          questions: [] },
  { sectionKey: "lifestyle_recovery",        title: "Lifestyle & Recovery",      questions: [] },
  { sectionKey: "goals_vision",             title: "Goals & Vision",            questions: [] },
  { sectionKey: "mindset_accountability",    title: "Mindset & Accountability",  questions: [] },
  { sectionKey: "spirit_new_beginnings",     title: "Spirit & New Beginnings",   questions: [] },
];

/** Look up a section config by its key */
export function getSectionConfig(sectionKey: string): SectionConfig | undefined {
  return SECTION_CONFIGS.find((s) => s.sectionKey === sectionKey);
}

/** Look up a section config by its display title */
export function getSectionByTitle(title: string): SectionConfig | undefined {
  return SECTION_CONFIGS.find((s) => s.title === title);
}
