"use client";

// ─────────────────────────────────────────────
// AlertCardActions — client component for alert lifecycle
//
// Renders lifecycle buttons and, when "Action Taken" is
// selected, opens an inline intervention form. Only this
// component is a client component.
// ─────────────────────────────────────────────

import { useState, useTransition } from "react";
import { updateAlertStatus, updateAlertIntervention } from "@/app/coach/(protected)/alerts/actions";
import type { AlertStatus, InterventionType } from "@/lib/coach/alerts/types";
import { INTERVENTION_LABELS } from "@/lib/coach/alerts/types";

interface AlertCardActionsProps {
  clientId: string;
  alertType: string;
  currentStatus: AlertStatus;
}

const cinzel = "'Cinzel', serif";
const ebGaramond = "'EB Garamond', serif";

const interventionOptions: InterventionType[] = [
  "message_client",
  "adjust_habit",
  "schedule_call",
  "review_progress",
  "other",
];

interface ActionDef {
  label: string;
  nextStatus: AlertStatus;
  opensForm?: boolean;
  style: { color: string; borderColor: string; hoverBg: string };
}

function getActions(currentStatus: AlertStatus): ActionDef[] {
  switch (currentStatus) {
    case "new":
      return [
        {
          label: "Mark Reviewed",
          nextStatus: "reviewed",
          style: { color: "#B8933A", borderColor: "#2A2010", hoverBg: "rgba(184,147,58,0.08)" },
        },
        {
          label: "Action Taken",
          nextStatus: "action_taken",
          opensForm: true,
          style: { color: "#B8933A", borderColor: "#2A2010", hoverBg: "rgba(184,147,58,0.08)" },
        },
        {
          label: "Resolve",
          nextStatus: "resolved",
          style: { color: "#1D9E75", borderColor: "#0D3A25", hoverBg: "rgba(29,158,117,0.08)" },
        },
      ];
    case "reviewed":
      return [
        {
          label: "Action Taken",
          nextStatus: "action_taken",
          opensForm: true,
          style: { color: "#B8933A", borderColor: "#2A2010", hoverBg: "rgba(184,147,58,0.08)" },
        },
        {
          label: "Resolve",
          nextStatus: "resolved",
          style: { color: "#1D9E75", borderColor: "#0D3A25", hoverBg: "rgba(29,158,117,0.08)" },
        },
        {
          label: "Reopen",
          nextStatus: "new",
          style: { color: "#807868", borderColor: "#1A1A1A", hoverBg: "rgba(255,255,255,0.02)" },
        },
      ];
    case "action_taken":
      return [
        {
          label: "Intervention",
          nextStatus: "intervention",
          style: { color: "#B8933A", borderColor: "#2A2010", hoverBg: "rgba(184,147,58,0.08)" },
        },
        {
          label: "Resolve",
          nextStatus: "resolved",
          style: { color: "#1D9E75", borderColor: "#0D3A25", hoverBg: "rgba(29,158,117,0.08)" },
        },
        {
          label: "Reopen",
          nextStatus: "new",
          style: { color: "#807868", borderColor: "#1A1A1A", hoverBg: "rgba(255,255,255,0.02)" },
        },
      ];
    case "intervention":
      return [
        {
          label: "Resolve",
          nextStatus: "resolved",
          style: { color: "#1D9E75", borderColor: "#0D3A25", hoverBg: "rgba(29,158,117,0.08)" },
        },
        {
          label: "Reopen",
          nextStatus: "new",
          style: { color: "#807868", borderColor: "#1A1A1A", hoverBg: "rgba(255,255,255,0.02)" },
        },
      ];
    case "resolved":
      return [
        {
          label: "Reopen",
          nextStatus: "new",
          style: { color: "#807868", borderColor: "#1A1A1A", hoverBg: "rgba(255,255,255,0.02)" },
        },
      ];
  }
}

export function AlertCardActions({ clientId, alertType, currentStatus }: AlertCardActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [interventionType, setInterventionType] = useState<InterventionType>("message_client");
  const [interventionNote, setInterventionNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const actions = getActions(currentStatus);

  function handleClick(action: ActionDef) {
    if (action.opensForm) {
      setShowForm(true);
      return;
    }
    startTransition(async () => {
      await updateAlertStatus(clientId, alertType, action.nextStatus);
    });
  }

  function handleSubmitIntervention() {
    startTransition(async () => {
      await updateAlertIntervention(clientId, alertType, {
        interventionType,
        interventionNote,
        followUpDate: followUpDate || null,
      });
      setShowForm(false);
      setInterventionNote("");
      setFollowUpDate("");
    });
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {actions.map((action) => (
          <button
            key={action.nextStatus}
            type="button"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClick(action);
            }}
            className="rounded border uppercase transition-colors disabled:opacity-50"
            style={{
              fontFamily: cinzel,
              fontSize: "7px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: action.style.color,
              borderColor: action.style.borderColor,
              background: "transparent",
              padding: "3px 8px",
              cursor: isPending ? "wait" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isPending) e.currentTarget.style.background = action.style.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {isPending ? "..." : action.label}
          </button>
        ))}
      </div>

      {/* Intervention form */}
      {showForm && (
        <div
          className="rounded-[5px] border border-[#1A1A1A] mt-1"
          style={{ background: "#111111", padding: "10px 12px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="uppercase block mb-2"
            style={{ fontFamily: cinzel, fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#807868" }}
          >
            Record Intervention
          </span>

          {/* Intervention type */}
          <label
            className="uppercase block mb-1"
            style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
          >
            Type
          </label>
          <select
            value={interventionType}
            onChange={(e) => setInterventionType(e.target.value as InterventionType)}
            className="w-full rounded border border-[#1A1A1A] mb-2"
            style={{
              fontFamily: ebGaramond,
              fontSize: "11px",
              color: "#DDD5C0",
              background: "#0D0D0D",
              padding: "5px 8px",
              outline: "none",
            }}
          >
            {interventionOptions.map((opt) => (
              <option key={opt} value={opt}>{INTERVENTION_LABELS[opt]}</option>
            ))}
          </select>

          {/* Intervention note */}
          <label
            className="uppercase block mb-1"
            style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
          >
            Note
          </label>
          <textarea
            value={interventionNote}
            onChange={(e) => setInterventionNote(e.target.value)}
            rows={2}
            placeholder="What action did you take?"
            className="w-full rounded border border-[#1A1A1A] mb-2 resize-none"
            style={{
              fontFamily: ebGaramond,
              fontSize: "11px",
              color: "#DDD5C0",
              background: "#0D0D0D",
              padding: "5px 8px",
              outline: "none",
            }}
          />

          {/* Follow-up date */}
          <label
            className="uppercase block mb-1"
            style={{ fontFamily: cinzel, fontSize: "6px", fontWeight: 700, letterSpacing: "0.08em", color: "#4A3F2A" }}
          >
            Follow-up Date (optional)
          </label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded border border-[#1A1A1A] mb-2.5"
            style={{
              fontFamily: ebGaramond,
              fontSize: "11px",
              color: "#DDD5C0",
              background: "#0D0D0D",
              padding: "5px 8px",
              outline: "none",
              colorScheme: "dark",
            }}
          />

          {/* Submit / Cancel */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmitIntervention();
              }}
              className="rounded border uppercase transition-colors disabled:opacity-50"
              style={{
                fontFamily: cinzel,
                fontSize: "7px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#1D9E75",
                borderColor: "#0D3A25",
                background: "rgba(29,158,117,0.08)",
                padding: "4px 10px",
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              {isPending ? "Saving..." : "Save Intervention"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowForm(false);
              }}
              className="rounded border uppercase transition-colors"
              style={{
                fontFamily: cinzel,
                fontSize: "7px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#4A3F2A",
                borderColor: "#1A1A1A",
                background: "transparent",
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
