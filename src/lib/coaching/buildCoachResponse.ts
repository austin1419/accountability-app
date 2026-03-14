// ─────────────────────────────────────────────
// buildCoachResponse — deterministic coaching
// response builder.
//
// Pipeline:
//   signals → scenario detection → message
//   selection → coaching response
//
// Not connected to UI yet — this file only
// defines the response builder.
// ─────────────────────────────────────────────

import { detectScenario, type ScenarioSignals } from "./detectScenario";
import { coachingMessages } from "./messages";
import type { CoachingScenario } from "./scenarios";

export type CoachResponse = {
  scenario: CoachingScenario;
  message: string;
};

export function buildCoachResponse(signals: ScenarioSignals): CoachResponse {
  // 1. Determine which coaching scenario applies
  const scenario = detectScenario(signals);

  // 2. Get the message pool for this scenario
  const messages = coachingMessages[scenario];

  // 3. Select a random message, or fall back to a generic nudge
  const message =
    messages && messages.length > 0
      ? messages[Math.floor(Math.random() * messages.length)]
      : "You're building momentum. Stay consistent today.";

  // 4. Return the structured coaching response
  return {
    scenario,
    message,
  };
}
