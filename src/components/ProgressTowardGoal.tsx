// ─────────────────────────────────────────────
// ProgressTowardGoal — shared between Dashboard and Profile
//
// Shows a progress ring + starting/current/goal stats
// for weight, body composition, or performance goals.
// ─────────────────────────────────────────────

import { ProgressRing } from "@/components/ProgressRing";
import type { GoalMetrics } from "@/lib/server-queries";

type Props = {
  goal: GoalMetrics & {
    goal_name:    string;
    goal_date:    string | null;
    goalProgress: number;
  };
};

export function ProgressTowardGoal({ goal }: Props) {
  const goalProgress = goal.goalProgress;

  return (
    <section className="bg-[#141414] rounded p-5 border border-[#252525]">
      <p
        className="text-xs uppercase tracking-widest text-[#9A9080] mb-4"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Progress Toward Goal
      </p>
      <div className="flex items-center gap-5">
        <div className="relative flex items-center justify-center flex-shrink-0">
          <ProgressRing percent={goalProgress} color="#B8933A" />
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold text-[#DDD5C0]">{goalProgress}%</span>
            <span className="text-xs text-[#9A9080]">complete</span>
          </div>
        </div>

        {/* Weight: Starting → Current → Goal */}
        {goal.goal_category === "weight" && (
          <div className="flex flex-col gap-2">
            {[
              { label: "Starting", value: goal.start_weight   != null ? `${goal.start_weight} lbs`   : "—", color: "text-[#9A9080]" },
              { label: "Current",  value: goal.current_weight != null ? `${goal.current_weight} lbs` : "—", color: "text-[#DDD5C0]" },
              { label: "Goal",     value: goal.goal_weight    != null ? `${goal.goal_weight} lbs`    : "—", color: "text-[#B8933A]" },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-[10px] text-[#807868]">{row.label}</p>
                <p className={`text-sm font-semibold ${row.color}`}>{row.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Body composition: BF + SMM */}
        {goal.goal_category === "body_composition" && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#C04040] mb-1">Body Fat</p>
              {[
                { label: "Starting", value: goal.starting_body_fat != null ? `${goal.starting_body_fat}%` : "—" },
                { label: "Current",  value: goal.current_body_fat  != null ? `${goal.current_body_fat}%`  : "—" },
                { label: "Goal",     value: goal.goal_body_fat     != null ? `${goal.goal_body_fat}%`     : "—" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <p className="text-[10px] text-[#807868]">{row.label}</p>
                  <p className="text-xs font-semibold text-[#DDD5C0]">{row.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#B89B3A] mb-1">SMM</p>
              {[
                { label: "Starting", value: goal.starting_smm != null ? `${goal.starting_smm} lbs` : "—" },
                { label: "Current",  value: goal.current_smm  != null ? `${goal.current_smm} lbs`  : "—" },
                { label: "Goal",     value: goal.goal_smm     != null ? `${goal.goal_smm} lbs`     : "—" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <p className="text-[10px] text-[#807868]">{row.label}</p>
                  <p className="text-xs font-semibold text-[#DDD5C0]">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance: Starting → Current → Goal */}
        {goal.goal_category === "performance" && (
          <div className="flex flex-col gap-2">
            {[
              { label: "Starting", value: goal.starting_performance_value != null ? `${goal.starting_performance_value}${goal.performance_unit ? ` ${goal.performance_unit}` : ""}` : "—", color: "text-[#9A9080]" },
              { label: "Current",  value: goal.current_performance_value  != null ? `${goal.current_performance_value}${goal.performance_unit  ? ` ${goal.performance_unit}` : ""}` : "—", color: "text-[#DDD5C0]" },
              { label: "Goal",     value: goal.goal_performance_value     != null ? `${goal.goal_performance_value}${goal.performance_unit     ? ` ${goal.performance_unit}` : ""}` : "—", color: "text-[#B8933A]" },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-[10px] text-[#807868]">{row.label}</p>
                <p className={`text-sm font-semibold ${row.color}`}>{row.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
